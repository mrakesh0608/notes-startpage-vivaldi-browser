import { trashSVG, timeHourMin, getArrayFromStorage, deleteArrayFromStorage } from './myUtil/util';

export const addNewNotes = (text) => {
    return new Promise((resolve) => {
        const fun = async () => {
            let newQuotes = [{
                _id: timeHourMin(),
                text,
                isChecked: false
            }];

            const oldQuotes = await getArrayFromStorage("myNotes");
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

export const updateNote = (note)=> {
    return new Promise((resolve) => {
        const fun = async (quotes) => {
            const notes = await getArrayFromStorage("myNotes");
            objIndex = notes.findIndex((obj => obj._id === note._id));
            document.getElementById('quoteText').innerHTML = 'in ' + note._id + note.text;

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

export const removeNoteById = (note) =>{
    return new Promise((resolve) => {
        const fun = async () => {
            const notes = await getArrayFromStorage("myNotes");
            const uNotes = notes.filter((obj => obj._id !== note._id));

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

function removeItem(e) {
    let li = e.target.closest('li');
    document.getElementById('list').removeChild(li);
}

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
    deleteBtn.addEventListener('click', removeItem);
    deleteBtn.innerHTML = trashSVG;

    li.appendChild(ipCheckBox);
    li.appendChild(text);
    li.appendChild(deleteBtn);

    document.getElementById('list').appendChild(li);
}
async function renderNotes() {
    // return
    const notes = await getArrayFromStorage("myNotes");

    document.getElementById('noNotes').style.display = notes.length ? 'none' : 'block';
    document.getElementById('list').innerHTML = '';

    notes.forEach(item => { addLiToList(item) })
}