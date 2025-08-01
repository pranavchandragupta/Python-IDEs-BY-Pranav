let pyodideReady = false;
let pyodide = null;
let editor = null;

// Theme and font-size toggle
const themeBtn = document.getElementById('theme-toggle');
const fontSizeSel = document.getElementById('font-size');
themeBtn.onclick = () => {
    document.body.classList.toggle('dark');
    window.monaco?.editor.setTheme(document.body.classList.contains('dark') ? "vs-dark" : "vs");
};
fontSizeSel.onchange = () => {
    if(editor) editor.updateOptions({fontSize: parseInt(fontSizeSel.value)});
};

function showOutput(msg, isErr=false) {
    const con = document.getElementById('output');
    con.innerHTML = '';
    let pre = document.createElement('pre');
    pre.textContent = msg;
    pre.style.color = isErr ? "#ff6070" : "";
    con.appendChild(pre);
}

function appendOutput(msg, isErr=false) {
    const con = document.getElementById('output');
    let pre = document.createElement('pre');
    pre.textContent = msg;
    pre.style.color = isErr ? "#ff6070" : "";
    con.appendChild(pre);
}

async function main() {
    showOutput("⏳ Loading Python runtime...");
    pyodide = await loadPyodide();
    pyodideReady = true;
    showOutput("Python 3 ready! 🚀\nClick ▶ Run to execute your code.\n");
}

main();

// Monaco Editor boot
require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.45.0/min/vs' }});
window.MonacoEnvironment = { getWorkerUrl: () => proxy };
let proxy = URL.createObjectURL(new Blob([`
    self.MonacoEnvironment = {baseUrl: 'https://unpkg.com/monaco-editor@0.45.0/min/'};
    importScripts('https://unpkg.com/monaco-editor@0.45.0/min/vs/base/worker/workerMain.js');
`], {type: 'text/javascript'}));

function setupEditor(){
    window.monaco.editor.create(document.getElementById('editor'), {
        value: `# Welcome to Python!\nprint("Hello, World!")\nfor i in range(3): print("Counting:", i)`,
        language: "python",
        theme: document.body.classList.contains('dark') ? "vs-dark" : "vs",
        fontSize: parseInt(fontSizeSel.value),
        minimap: { enabled: false }
    });
    editor = window.monaco.editor.getModels()[0].getEditor();
}
require(['vs/editor/editor.main'], function() {
    window.monaco.editor.create(document.getElementById('editor'), {
        value: `# Welcome to Python!\nprint("Hello, World!")\nfor i in range(3): print("Counting:", i)`,
        language: "python",
        theme: document.body.classList.contains('dark') ? "vs-dark" : "vs",
        fontSize: parseInt(fontSizeSel.value),
        minimap: { enabled: false }
    });
    // save for later
    editor = window.monaco.editor.getModels()[0].getEditor();
});


// Run Button Action
document.getElementById("run-btn").onclick = async function() {
    if (!pyodideReady) return showOutput("⏳ Python is still loading...");
    showOutput("⏳ Running...");
    const code = window.monaco.editor.getModels()[0].getValue();
    await pyodide.loadPackagesFromImports(code);
    let output = "";
    let error = "";
    // Patch print/input:
    pyodide.setStdout({
        batched: (s)=>output+=s
    });
    pyodide.setStderr({
        batched: (s)=>error+=s
    });
    function fakeInput(promptText) {
        let v = window.prompt(promptText || "input()");
        output += (promptText||"") + v + "\n";
        return v || "";
    }
    pyodide.globals.set("input", fakeInput);
    try {
        await pyodide.runPythonAsync(code);
        showOutput(output);
        if(error) appendOutput(error, true);
    } catch (e) {
        showOutput((output ? output + '\n' : '') + '❌ ' + (e.message || e), true);
    }
};
