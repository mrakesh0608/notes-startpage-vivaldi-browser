const trashSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26" height="20px"><path d="M 13.59375 4 L 13.28125 4.28125 L 12.5625 5 L 6 5 L 6 7 L 7 7 L 7 25 C 7 26.644531 8.355469 28 10 28 L 22 28 C 23.644531 28 25 26.644531 25 25 L 25 7 L 26 7 L 26 5 L 19.4375 5 L 18.71875 4.28125 L 18.40625 4 Z M 14.4375 6 L 17.5625 6 L 18.28125 6.71875 L 18.59375 7 L 23 7 L 23 25 C 23 25.554688 22.554688 26 22 26 L 10 26 C 9.445313 26 9 25.554688 9 25 L 9 7 L 13.40625 7 L 13.71875 6.71875 Z M 11 11 L 11 22 L 13 22 L 13 11 Z M 15 11 L 15 22 L 17 22 L 17 11 Z M 19 11 L 19 22 L 21 22 L 21 11 Z"/></svg>'


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
async function addNewNotes(note) {
    return new Promise((resolve) => {
        const fun = async (quotes) => {
            let newQuotes = [note];

            const oldQuotes = await getNotesFromStorage();
            const allQuotes = newQuotes.concat(oldQuotes);

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

async function deleteAllNotesFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.set({ myNotes: [] });
        resolve(true);
    });
}


//Delete Event
function removeItem(e) {
    let li = e.target.parentElement;
    document.getElementById('list').removeChild(li);
}

// inputs the actual quote while determining if it should be new or the same as before
function addLiToList(newItem) {

    let itemList = document.getElementById('list');

    //create new li element
    let li = document.createElement('li');
    li.className = 'item-list';

    //get input value

    document.getElementById('new-item').value = "";;
    li.appendChild(document.createTextNode(newItem));

    //delete btn
    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'item-btn';
    deleteBtn.addEventListener('click',removeItem);
    deleteBtn.appendChild(document.createTextNode(trashSVG));
    li.appendChild(deleteBtn);

    console.log(li);
    itemList.appendChild(li);
}
async function renderNotes() {
    return
    document.getElementById('list').innerHTML = '';

    const notes = await getNotesFromStorage();

    document.getElementById('noNotes').style.display = notes.length ? 'none' : 'block';

    notes.forEach(item => {
        addLiToList(item);
    })
}

//addNotes Event
async function addEvent() {
    let newItem = document.getElementById('new-item').value;
    if (newItem) {
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

    const startpageNav = document.getElementById("myElements");
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
        <div id='notes-header'>
        <h1>Notes</h1>
        <div>
            <div>
                


            <div>
            <button class="btn">Delete All Notes</button>
            <button class="btn">Delete All Checked Notes</button>
        </div>
        <div id="add-form">
            <textarea id="new-item" placeholder="New note ..."></textarea>
            <input type="submit" value="Add" id="submit-btn" class='btn'>
        </div>



            </div>
            <div></div>
        </div>
        
        <div id='noNotes'><span>No Notes</span></div>
        <ul id="list">
            <li class="item-list">
                <input type="checkbox" class="checkbox">
                <span>Lorem ipsum dolor sit amet consectetur adipisicing elit. Accusantium et itaque fuga possimus
                    enim. Excepturi, aliquam? Dolorum incidunt error ad labore nemo fugit perspiciatis veniam
                    architecto. Natus doloremque labore aliquid.</span>
                <button class="btn btn-close"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26" height="20px"><path d="M 13.59375 4 L 13.28125 4.28125 L 12.5625 5 L 6 5 L 6 7 L 7 7 L 7 25 C 7 26.644531 8.355469 28 10 28 L 22 28 C 23.644531 28 25 26.644531 25 25 L 25 7 L 26 7 L 26 5 L 19.4375 5 L 18.71875 4.28125 L 18.40625 4 Z M 14.4375 6 L 17.5625 6 L 18.28125 6.71875 L 18.59375 7 L 23 7 L 23 25 C 23 25.554688 22.554688 26 22 26 L 10 26 C 9.445313 26 9 25.554688 9 25 L 9 7 L 13.40625 7 L 13.71875 6.71875 Z M 11 11 L 11 22 L 13 22 L 13 11 Z M 15 11 L 15 22 L 17 22 L 17 11 Z M 19 11 L 19 22 L 21 22 L 21 11 Z"/></svg></button>
            </li>
            <li class="item-list">
                <input type="checkbox" class="checkbox">
                <span>Lorem ipsum dolor sit amet consectetur adipisicing elit. Accusantium et itaque fuga possimus
                    enim. Excepturi, aliquam? Dolorum incidunt error ad labore nemo fugit perspiciatis veniam
                    architecto. Natus doloremque labore aliquid.</span>
                <button class="btn btn-close">X</button>
            </li>
        </ul>
    `;

    refrenceElement.appendChild(quoteContainer);
    renderNotes();

    document.getElementById('submit-btn').addEventListener('click', addEvent);
    document.getElementById('deleteAllNotes').addEventListener('click', async () => {
        await deleteAllNotesFromStorage();
        renderNotes();
    });
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