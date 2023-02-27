function makeOrdable(target) {
    const lis = target.querySelectorAll("li");

    // Compute the centroid of an element in _page_ coordinates
    // (from the top-left of the page, accounting for the scroll).
    // We need to account for the scroll here because it is not only possible,
    // but actually _used_ by many that with long lists you can scroll while
    // you drag - pick an item, focus over the destination drop area and then scroll
    // using the wheel to "reposition" the area for your drop. Check this out, really -
    // it works like this in native macOS controls since ages.
    //
    // Also, one of the very good indications of web-engine based apps posing as native:
    // scroll-during-drag not working correctly. We will not be like those apps.
    function computeCentroid(element) {
        const rect = element.getBoundingClientRect();
        const viewportX = (rect.left + rect.right) / 2;
        const viewportY = (rect.top + rect.bottom) / 2;
        return { x: viewportX + window.scrollX, y: viewportY + window.scrollY };
    }

    function distanceSquaredBetweenCursorAndPoint(evt, centroid) {
        return (
            Math.pow(centroid.x - evt.clientX - window.scrollX, 2) +
            Math.pow(centroid.y - evt.clientY - window.scrollY, 2)
        );
    }

    const INTENT_BEFORE = Symbol("INTENT_BEFORE");
    const INTENT_AFTER = Symbol("INTENT_AFTER");
    const DIRECTION_HORIZONTAL = Symbol("DIRECTION_HORIZONTAL");
    const DIRECTION_VERTICAL = Symbol("DIRECTION_VERTICAL");

    function predictDirection(a, b) {
        if (!a || !b) return DIRECTION_HORIZONTAL;
        const dx = Math.abs(b.centroid.x - a.centroid.x);
        const dy = Math.abs(b.centroid.y - a.centroid.y);
        return dx > dy ? DIRECTION_HORIZONTAL : DIRECTION_VERTICAL;
    }

    function intentFrom(direction, evt, centroid) {
        if (direction === DIRECTION_HORIZONTAL) {
            if ((evt.clientX + window.scrollX) < centroid.x) {
                return INTENT_BEFORE;
            }
        } else {
            if ((evt.clientY + window.scrollY) < centroid.y) {
                return INTENT_BEFORE;
            }
        }
        return INTENT_AFTER;
    }

    function startReorderWithElement(el, { debug }) {
        const parent = el.parentNode;
        const orderables = Array.from(parent.children).map((element, i) => {
            return { i, element, centroid: computeCentroid(element) };
        });

        // Determine the dominant direction in the list - is it horizontal or vertical?
        const direction = predictDirection(orderables[0], orderables[1]);

        let closest = el;
        let intent = INTENT_AFTER;
        let marker = document.createElement(el.nodeName);
        marker.classList.add("insertion-marker");

        const unstyle = () => {
            orderables.forEach(({ element }) => {
                element.classList.remove("reorder-accepts-before");
                element.classList.remove("reorder-accepts-after");
            });
        };

        const mouseMoveHandler = (evt) => {
            evt.preventDefault();

            const byDistance = orderables.map((orderable) => {
                const ds = distanceSquaredBetweenCursorAndPoint(evt, orderable.centroid);
                return { ds, ...orderable };
            }).sort((a, b) => a.ds - b.ds);

            closest = byDistance[0].element;
            intent = intentFrom(direction, evt, byDistance[0].centroid);

            unstyle();
            marker.remove();

            if (intent === INTENT_BEFORE) {
                marker = closest.insertAdjacentElement("beforebegin", marker);
                closest.classList.add("reorder-accepts-before");
            } else {
                marker = closest.insertAdjacentElement("afterend", marker);
                closest.classList.add("reorder-accepts-after");
            }
        };
        parent.addEventListener("dragover", mouseMoveHandler);

        const stopFn = () => {
            unstyle();
            marker.remove();
            parent.removeEventListener("dragover", mouseMoveHandler);
            return { closest, intent };
        };

        return stopFn;
    }

    lis.forEach((li) => {
        li.addEventListener("dragstart", (evt) => {
            console.warn("reorder started");
            li.classList.add("selected");
            const stop = startReorderWithElement(li, { debug: true });

            li.parentNode.addEventListener("drop", (evt) => evt.preventDefault(), { once: true });
            li.addEventListener("dragend", (evt) => {
                evt.preventDefault();

                console.warn("reorder ending");
                li.classList.remove("selected");

                const { closest, intent } = stop();
                if (intent === INTENT_BEFORE) {
                    closest.insertAdjacentElement("beforebegin", li);
                } else {
                    closest.insertAdjacentElement("afterend", li);
                }

                updateReorderdList();
            }, { once: true });
        });
    });
}

async function updateReorderdList() {
    const notes = await getNotesFromStorage();
    let newNotes = [];
    document.getElementById('list').querySelectorAll('li').forEach(async (li) => {
        const note = await notes.filter(i => i._id === li.id)
        newNotes = newNotes.concat(note);
        document.getElementById('quoteText').innerHTML = newNotes.length;

        if (newNotes.length === notes.length) chrome.storage.local.set({ myNotes: newNotes });
    });
}

const trashSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 96 960 960" width="18"><path d="M261 936q-24.75 0-42.375-17.625T201 876V306h-41v-60h188v-30h264v30h188v60h-41v570q0 24-18 42t-42 18H261Zm438-630H261v570h438V306ZM367 790h60V391h-60v399Zm166 0h60V391h-60v399ZM261 306v570-570Z"/></svg>'

const plusSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M450 856V606H200v-60h250V296h60v250h250v60H510v250h-60Z"/></svg>'

const copySVG = `<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 96 960 960" width="18"><path d="M180 975q-24 0-42-18t-18-42V312h60v603h474v60H180Zm120-120q-24 0-42-18t-18-42V235q0-24 18-42t42-18h440q24 0 42 18t18 42v560q0 24-18 42t-42 18H300Zm0-60h440V235H300v560Zm0 0V235v560Z"/></svg>`

const timeHourMin = () => {
    return new Date().toLocaleString('en-IN', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    })
}

// gets all notes from storage and fails more nicely with an empty array
async function getNotesFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["myNotes"], function (result) {
            if (result["myNotes"]) resolve(result["myNotes"])
            else resolve([]);
        });
    });
}

// gets a set of 50 new quotes from zenquotes.io and adds them to the end of the collection
async function addNewNotes(text) {
    return new Promise((resolve) => {
        const fun = async () => {
            let newQuotes = [{
                _id: timeHourMin(),
                text,
                isChecked: false
            }];

            const oldQuotes = await getNotesFromStorage();
            const allQuotes = oldQuotes.concat(newQuotes);

            chrome.storage.local.set({ myNotes: allQuotes });

            if (allQuotes.length >= 1) {
                resolve(allQuotes);
            } else {
                resolve(["APIs are great, but sometimes they break."]);
            }
        };
        fun();
    });
}

// gets a set of 50 new quotes from zenquotes.io and adds them to the end of the collection
async function updateNote(note) {
    return new Promise((resolve) => {
        const fun = async (quotes) => {
            const notes = await getNotesFromStorage();
            objIndex = notes.findIndex((obj => obj._id === note._id));
            // document.getElementById('quoteText').innerHTML = 'in ' + note._id + note.text;

            notes[objIndex].isChecked = !note.isChecked;

            chrome.storage.local.set({ myNotes: [...notes] });

            if (notes.length >= 1) {
                resolve(notes);
            } else {
                resolve(["APIs are great, but sometimes they break."]);
            }
        };
        fun();
    });
}

// gets a set of 50 new quotes from zenquotes.io and adds them to the end of the collection
async function removeNoteById(id) {
    return new Promise((resolve) => {
        const fun = async () => {
            const notes = await getNotesFromStorage();
            const uNotes = notes.filter((obj => obj._id !== id));

            chrome.storage.local.set({ myNotes: [...uNotes] });

            if (notes.length >= 1) {
                resolve(notes);
            } else {
                resolve(["APIs are great, but sometimes they break."]);
            }
        };
        fun();
    });
}

//Delete Event
async function removeItem(e, id) {
    let li = e.target.closest('li');
    document.getElementById('list').removeChild(li);

    await removeNoteById(id);
    renderNotes();
}

// inputs the actual quote while determining if it should be new or the same as before
function addLiToList(note) {

    const li = document.createElement('li');
    li.id = note._id;
    li.className = 'item-list';
    li.draggable = true;

    const ipCheckBox = document.createElement('input');
    ipCheckBox.className = 'checkbox';
    ipCheckBox.type = 'checkbox';
    ipCheckBox.checked = note.isChecked;
    ipCheckBox.addEventListener('change', (e) => {
        updateNote(note)
    });

    const text = document.createElement('span');
    text.innerHTML = note.text;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-close';
    deleteBtn.addEventListener('click', (e) => removeItem(e, note._id));
    deleteBtn.innerHTML = trashSVG;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'mydefault-SVG';
    copyBtn.addEventListener('click', (e) => {
        navigator.clipboard.writeText(note.text);
        showSuccess(e.target);
    });
    copyBtn.innerHTML = copySVG;

    li.appendChild(ipCheckBox);
    li.appendChild(text);
    li.appendChild(copyBtn);
    li.appendChild(deleteBtn);

    document.getElementById('list').appendChild(li);
}

function liC() {
    let ul = document.createElement('li');
    ul.id = 'list';

    const div = document.createElement('div');
    div.id = 'list-container';
    div.appendChild(ul);

    return div;
}

async function renderNotes() {
    // return
    const notes = await getNotesFromStorage();
    // document.getElementById('quoteText').innerHTML = notes.length;

    if (document.getElementById('list-container')) document.getElementById('list-container').remove();

    if (notes.length) {
        document.getElementById('notesGrid').insertBefore(liC(), document.getElementById('notesGrid').firstChild);
        document.getElementById('notesGrid').style.gridTemplateColumns = '60% auto';

        notes.forEach(item => {
            addLiToList(item);
        })
        makeOrdable(document.getElementById("list"));
    }
    else document.getElementById('notesGrid').style.gridTemplateColumns = 'auto';
}

//addNotes Event
async function addEvent() {

    const newItem = document.getElementById('new-item').value;
    // document.getElementById('quoteText').innerHTML = newItem;
    if (!newItem) return;

    document.getElementById('new-item').value = '';
    showSuccess(document.getElementById('submit-btn'));
    await addNewNotes(newItem);
    renderNotes();
}
function showSuccess(element) {
    element.classList.add("successFill");
    setTimeout(function () {
        element.classList.remove("successFill");
        element.blur();
    }, 700);
}
// adds all the html necessary to view the quote
async function addNotesStructureToPage() {

    const startpage = document.querySelector(".startpage");
    const oldNote = document.getElementById("notesContainer");

    // BUG-FIX: quote was showing up on bookmarks, history, and notes pages
    const managerPage = document.querySelector(".webpageview.active .sdwrapper .manager");
    if (managerPage) {
        if (oldNote) oldNote.remove();
        return;
    }

    // check if already exists and elements are valid
    if (oldNote || !startpage) return;

    const startpageNav = document.querySelector(".startpage .startpage-content");
    let refrenceElement, position;

    if (startpageNav) {
        refrenceElement = startpageNav;
        position = "afterend";
    } else {
        refrenceElement = startpage;
        position = "afterbegin";
    }

    const quoteContainer = document.createElement("div");
    quoteContainer.id = "notesContainer";
    quoteContainer.innerHTML = `
        <div id="notesGrid">
            <div id="add-form">
                <textarea id="new-item" placeholder="New note"></textarea>
                <div id="add-form-btn">
                    <button type="submit" id="submit-btn" class='btn-svg'>${plusSVG}</button>
                </div>
            </div>
        </div>
    `;

    refrenceElement.insertAdjacentElement(position, quoteContainer);
    renderNotes();

    document.getElementById('submit-btn').addEventListener('click', addEvent);
    myBeautifulTextArea();
}

function myBeautifulTextArea() {
    const txHeight = 30;
    const tx = document.getElementsByTagName("textarea");

    for (let i = 0; i < tx.length; i++) {
        if (tx[i].value == '') {
            tx[i].setAttribute("style", "height:" + txHeight + "px;overflow-y:hidden;");
        } else {
            tx[i].setAttribute("style", "height:" + (tx[i].scrollHeight) + "px;overflow-y:hidden;");
        }
        tx[i].addEventListener("input", OnInput, false);
    }

    function OnInput(e) {
        this.style.height = 0;
        this.style.height = (this.scrollHeight) + "px";
    }
}


function notesToSpeeddial() {

    // only reliable way to detect new tabs including new windows with a single startpage tab
    vivaldi.tabsPrivate.onTabUpdated.addListener(addNotesStructureToPage);

    // catches all redrawings of the startpage including theme changes and switching back to a tab
    const appendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function () {
        if (arguments[0].tagName === "DIV") {
            setTimeout(
                function () {
                    if (this.classList.contains("startpage")) {
                        addNotesStructureToPage();
                    }
                }.bind(this, arguments[0])
            );
        }
        return appendChild.apply(this, arguments);
    };
}

let intervalID = setInterval(() => {
    const browser = document.getElementById("browser");
    if (browser) {
        clearInterval(intervalID);
        notesToSpeeddial();
    }
}, 100);