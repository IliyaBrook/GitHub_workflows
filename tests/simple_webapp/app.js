const noteInput = document.getElementById('noteInput');
const addBtn = document.getElementById('addBtn');
const notesList = document.getElementById('notesList');
const countEl = document.getElementById('count');

let notes = [];

function render() {
	notesList.innerHTML = '';
	notes.forEach((note, index) => {
		const li = document.createElement('li');
		li.innerHTML = `
      <span>${note}</span>
      <button class="delete-btn" onclick="deleteNote(${index})">×</button>
    `;
		notesList.appendChild(li);
	});
}

function addNote() {
	const text = noteInput.value.trim();
	if (!text) return;
	notes.push(text);
	noteInput.value = '';
	countEl.textContent = notes.length;
	render();
}

function deleteNote(index) {
	notes.splice(index, 1);
	render();
}

addBtn.addEventListener('click', addNote);
noteInput.addEventListener('keypress', (e) => {
	if (e.key === 'Enter') addNote();
});