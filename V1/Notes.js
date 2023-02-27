const trashSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 96 960 960" width="18"><path d="M261 936q-24.75 0-42.375-17.625T201 876V306h-41v-60h188v-30h264v30h188v60h-41v570q0 24-18 42t-42 18H261Zm438-630H261v570h438V306ZM367 790h60V391h-60v399Zm166 0h60V391h-60v399ZM261 306v570-570Z"/></svg>'

const plusSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M450 856V606H200v-60h250V296h60v250h250v60H510v250h-60Z"/></svg>'


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

    li.appendChild(ipCheckBox);
    li.appendChild(text);
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
    }
    else document.getElementById('notesGrid').style.gridTemplateColumns = 'auto';
}

//addNotes Event
async function addEvent() {
    let newItem = document.getElementById('new-item').value;
    // document.getElementById('quoteText').innerHTML = newItem;
    if (newItem) {
        document.getElementById('new-item').value = '';
        await addNewNotes(newItem);
        renderNotes();
    }
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