const addTaskButton = document.getElementById('add-task-button');
const taskDescription = document.getElementById('add-task-description');
const taskDate = document.getElementById('add-task-date');
const newTaskForm = document.getElementById('new-task-form');
const list = document.querySelector('ul');

// addTaskButton.addEventListener('click', (evt) => {
//     evt.preventDefault();
//     taskDescription.className = 'active';
//     taskDate.className = 'active';
// })

let db;
const openRequest = window.indexedDB.open('tasks_db', 1);

openRequest.addEventListener("error", () =>
    console.error("Database failed to open")
);

// success handler signifies that the database opened successfully
openRequest.addEventListener("success", () => {
    console.log("Database opened successfully");

    // Store the opened database object in the db variable. This is used a lot below
    db = openRequest.result;

    db.onversionchange = function(event) {
        event.target.close();
    }

    // Run the displayData() function to display the notes already in the IDB
    displayData();
});

openRequest.addEventListener("upgradeneeded", (e) => {
    // Grab a reference to the opened database
    db = e.target.result;

    // Create an objectStore in our database to store notes and an auto-incrementing key
    // An objectStore is similar to a 'table' in a relational database
    const objectStore = db.createObjectStore("tasks_os", {
        keyPath: "id",
        autoIncrement: true,
    });

    // Define what data items the objectStore will contain
    objectStore.createIndex("date", "date", { unique: true });
    objectStore.createIndex("description", "description", { unique: false });

    console.log("Database setup complete");
});

newTaskForm.addEventListener('submit', addData);

function getAllItems() {
    let trans = db.transaction("tasks_os");
    let store = trans.objectStore("tasks_os");
    let items = [];

    // trans.oncomplete = function(evt) {
    //     // callback(items);
    // };

    let cursorRequest = store.openCursor();

    cursorRequest.onerror = function(error) {
        console.log(error);
    };

    cursorRequest.onsuccess = function(evt) {
        let cursor = evt.target.result;
        if (cursor) {
            items.push(cursor.value);
            cursor.continue();
        }

    };
    return items;
}

function returnValues(items) {
    console.log(items[1])
}

function addData(e) {
    // prevent default - we don't want the form to submit in the conventional way
    e.preventDefault();

    // grab the values entered into the form fields and store them in an object ready for being inserted into the DB
    const newItem = { date: taskDate.value, description: taskDescription.value };

    // open a read/write db transaction, ready for adding the data
    const transaction = db.transaction(["tasks_os"], "readwrite");

    // call an object store that's already been added to the database
    const objectStore = transaction.objectStore("tasks_os");

    // Make a request to add our newItem object to the object store
    const addRequest = objectStore.add(newItem);

    // const objectAll = objectStore.getAll().result;




    addRequest.addEventListener("success", () => {
        // Clear the form, ready for adding the next entry
        taskDate.value = "";
        taskDescription.value = "";
    });

    // Report on the success of the transaction completing, when everything is done
    transaction.addEventListener("complete", () => {
        console.log("Transaction completed: database modification finished.");

        // update the display of data to show the newly added item, by running displayData() again.
        displayData();
    });

    transaction.addEventListener("error", () =>
        console.log("Transaction not opened due to error")
    );
}

// Define the displayData() function
function displayData() {
    // Here we empty the contents of the list element each time the display is updated
    // If you didn't do this, you'd get duplicates listed each time a new note is added
    while (list.firstChild) {
        list.removeChild(list.firstChild);
    }

    // Open our object store and then get a cursor - which iterates through all the
    // different data items in the store
    const objectStore = db.transaction("tasks_os").objectStore("tasks_os");
    objectStore.openCursor().addEventListener("success", (e) => {
        // Get a reference to the cursor
        const cursor = e.target.result;

        // If there is still another data item to iterate through, keep running this code
        if (cursor) {
            // Create a list item, h3, and p to put each data item inside when displaying it
            // structure the HTML fragment, and append it inside the list
            const listItem = document.createElement("li");
            const h3 = document.createElement("h3");
            const para = document.createElement("p");

            listItem.appendChild(h3);
            listItem.appendChild(para);
            list.appendChild(listItem);

            // Put the data from the cursor inside the h3 and para
            h3.textContent = cursor.value.date;
            para.textContent = cursor.value.description;

            // Store the ID of the data item inside an attribute on the listItem, so we know
            // which item it corresponds to. This will be useful later when we want to delete items
            listItem.setAttribute("data-note-id", cursor.value.id);

            // Create a button and place it inside each listItem
            const deleteBtn = document.createElement("button");
            listItem.appendChild(deleteBtn);
            deleteBtn.textContent = "Delete";

            // Set an event handler so that when the button is clicked, the deleteItem()
            // function is run
            deleteBtn.addEventListener("click", deleteItem);

            // Iterate to the next item in the cursor
            cursor.continue();
        } else {
            // Again, if list item is empty, display a 'No notes stored' message
            if (!list.firstChild) {
                const listItem = document.createElement("li");
                listItem.textContent = "No notes stored.";
                list.appendChild(listItem);
            }
            // if there are no more cursor items to iterate through, say so
            console.log("Notes all displayed");
        }
    });
}

// Define the deleteItem() function
function deleteItem(e) {
    // retrieve the name of the task we want to delete. We need
    // to convert it to a number before trying to use it with IDB; IDB key
    // values are type-sensitive.
    const noteId = Number(e.target.parentNode.getAttribute("data-note-id"));

    // open a database transaction and delete the task, finding it using the id we retrieved above
    const transaction = db.transaction(["tasks_os"], "readwrite");
    const objectStore = transaction.objectStore("tasks_os");
    const deleteRequest = objectStore.delete(noteId);

    // report that the data item has been deleted
    transaction.addEventListener("complete", () => {
        // delete the parent of the button
        // which is the list item, so it is no longer displayed
        e.target.parentNode.parentNode.removeChild(e.target.parentNode);
        console.log(`Note ${noteId} deleted.`);

        // Again, if list item is empty, display a 'No notes stored' message
        if (!list.firstChild) {
            const listItem = document.createElement("li");
            listItem.textContent = "No notes stored.";
            list.appendChild(listItem);
        }
    });
}