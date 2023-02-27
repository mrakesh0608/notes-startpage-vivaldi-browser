const trashSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 96 960 960" width="18"><path d="M261 936q-24.75 0-42.375-17.625T201 876V306h-41v-60h188v-30h264v30h188v60h-41v570q0 24-18 42t-42 18H261Zm438-630H261v570h438V306ZM367 790h60V391h-60v399Zm166 0h60V391h-60v399ZM261 306v570-570Z"/></svg>'

const plusSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M450 856V606H200v-60h250V296h60v250h250v60H510v250h-60Z"/></svg>'

const copySVG = `<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 96 960 960" width="18"><path d="M180 975q-24 0-42-18t-18-42V312h60v603h474v60H180Zm120-120q-24 0-42-18t-18-42V235q0-24 18-42t42-18h440q24 0 42 18t18 42v560q0 24-18 42t-42 18H300Zm0-60h440V235H300v560Zm0 0V235v560Z"/></svg>`

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

        notes.forEach(item => { addLiToList(item) })

        makeOrdable(document.getElementById("list"), updateReorderdList);
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
    }
    else {
        refrenceElement = startpage;
        position = "afterbegin";
    }

    const notesContainer = document.createElement("div");
    notesContainer.id = "notesContainer";
    notesContainer.innerHTML = `
        <div id="notesGrid">
            <div id="add-form">
                <textarea id="new-item" placeholder="New note"></textarea>
                <div id="add-form-btn">
                    <button type="submit" id="submit-btn" class='btn-svg'>${plusSVG}</button>
                </div>
            </div>
        </div>
    `;

    refrenceElement.insertAdjacentElement(position, notesContainer);
    initNotes();
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

    if (!browser) return;

    clearInterval(intervalID);
    notesToSpeeddial();
}, 100);