export const trashSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" height="18px"><path d="M 13.59375 4 L 13.28125 4.28125 L 12.5625 5 L 6 5 L 6 7 L 7 7 L 7 25 C 7 26.644531 8.355469 28 10 28 L 22 28 C 23.644531 28 25 26.644531 25 25 L 25 7 L 26 7 L 26 5 L 19.4375 5 L 18.71875 4.28125 L 18.40625 4 Z M 14.4375 6 L 17.5625 6 L 18.28125 6.71875 L 18.59375 7 L 23 7 L 23 25 C 23 25.554688 22.554688 26 22 26 L 10 26 C 9.445313 26 9 25.554688 9 25 L 9 7 L 13.40625 7 L 13.71875 6.71875 Z M 11 11 L 11 22 L 13 22 L 13 11 Z M 15 11 L 15 22 L 17 22 L 17 11 Z M 19 11 L 19 22 L 21 22 L 21 11 Z"/></svg>'

export const timeHourMin = () => {

    return new Date().toLocaleString('en-IN', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    })
}

export const getArrayFromStorage = async (arrayName) => {

    return new Promise((resolve) => {
        chrome.storage.local.get([arrayName], function (result) {
            if (result[arrayName]) resolve(result[arrayName])
            else resolve([]);
        });
    });
}

export const deleteArrayFromStorage = (arrayName) => {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [arrayName]: [] });
        resolve(true);
    });
}