// Python IDE for Schools - Main JavaScript File

class PythonIDE {
    constructor() {
        this.editor = null;
        this.pyodide = null;
        this.isLoading = true;
        this.isRunning = false;
        this.fontSize = 14;
        this.theme = 'light';
        
        // Default Python code for students
        this.defaultCode = `# Welcome to Python IDE for Schools!
# Type your Python code here and click Run

name = input("What's your name? ")
print(f"Hello, {name}!")

# Try some basic math
for i in range(1, 6):
    print(f"{i} squared is {i**2}")

print("Happy coding! 🐍")`;

        this.init();
    }

    async init() {
        try {
            this.log('Initializing IDE...');
            
            // Initialize theme first
            this.initTheme();
            
            // Setup event listeners early
            this.setupEventListeners();
            
            // Initialize Monaco Editor
            this.log('Loading code editor...');
            await this.initEditor();
            this.log('Code editor loaded successfully');
            
            // Initialize Pyodide
            this.log('Loading Python environment...');
            await this.initPyodide();
            this.log('Python environment loaded successfully');
            
            // Hide loading overlay
            this.hideLoading();
            
            this.updateStatus('Ready', 'success');
            this.log('IDE initialization complete!');
            
        } catch (error) {
            console.error('Failed to initialize IDE:', error);
            this.log(`Initialization failed: ${error.message}`);
            this.updateStatus('Initialization failed', 'error');
            this.hideLoading();
        }
    }

    log(message) {
        const console = document.getElementById('console');
        if (console) {
            const logDiv = document.createElement('div');
            logDiv.style.color = 'var(--color-text-secondary)';
            logDiv.style.fontSize = '0.9em';
            logDiv.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            console.appendChild(logDiv);
            console.scrollTop = console.scrollHeight;
        }
        console.log(message);
    }

    initTheme() {
        // Check for saved theme or default to light
        const savedTheme = localStorage.getItem('pythonide-theme');
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        this.theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
        
        // Load saved font size
        const savedFontSize = localStorage.getItem('pythonide-fontsize');
        if (savedFontSize) {
            this.fontSize = parseInt(savedFontSize, 10) || 14;
        }
        
        this.applyTheme();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-color-scheme', this.theme);
        const themeButton = document.getElementById('themeToggle');
        if (themeButton) {
            themeButton.textContent = this.theme === 'dark' ? '☀️' : '🌙';
            themeButton.setAttribute('aria-label', `Switch to ${this.theme === 'dark' ? 'light' : 'dark'} theme`);
        }
        
        // Update Monaco editor theme if it exists
        if (this.editor && window.monaco) {
            const monacoTheme = this.theme === 'dark' ? 'vs-dark' : 'vs';
            window.monaco.editor.setTheme(monacoTheme);
        }
    }

    async initEditor() {
        return new Promise((resolve, reject) => {
            // Load Monaco Editor
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
            script.onload = () => {
                window.require.config({ 
                    paths: { 
                        'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' 
                    }
                });
                
                window.require(['vs/editor/editor.main'], () => {
                    try {
                        const editorContainer = document.getElementById('editor');
                        if (!editorContainer) {
                            throw new Error('Editor container not found');
                        }

                        // Create the editor with simplified options
                        this.editor = window.monaco.editor.create(editorContainer, {
                            value: this.defaultCode,
                            language: 'python',
                            theme: this.theme === 'dark' ? 'vs-dark' : 'vs',
                            fontSize: this.fontSize,
                            lineNumbers: 'on',
                            automaticLayout: true,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            tabSize: 4,
                            insertSpaces: true
                        });

                        // Handle editor resize
                        const resizeObserver = new ResizeObserver(() => {
                            if (this.editor) {
                                this.editor.layout();
                            }
                        });
                        resizeObserver.observe(editorContainer);

                        resolve();
                    } catch (error) {
                        reject(new Error(`Editor creation failed: ${error.message}`));
                    }
                });
            };
            script.onerror = () => reject(new Error('Failed to load Monaco Editor'));
            document.head.appendChild(script);
        });
    }

    async initPyodide() {
        try {
            // Initialize Pyodide
            if (typeof loadPyodide === 'undefined') {
                throw new Error('Pyodide not loaded');
            }

            this.pyodide = await loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
            });
            
            // Setup input/output redirection
            this.pyodide.runPython(`
import sys
import io
from js import prompt, console as js_console

# Create a custom stdout that captures output
class JSStdout:
    def __init__(self):
        self.buffer = []
    
    def write(self, text):
        if text.strip():
            self.buffer.append(text)
        return len(text)
    
    def flush(self):
        pass
    
    def get_output(self):
        result = ''.join(self.buffer)
        self.buffer.clear()
        return result

# Custom input function
def js_input(prompt_text=""):
    try:
        result = prompt(str(prompt_text) if prompt_text else "Enter input:")
        return result if result is not None else ""
    except:
        return ""

# Replace built-in functions
stdout_capture = JSStdout()
sys.stdout = stdout_capture
__builtins__['input'] = js_input
            `);
            
        } catch (error) {
            throw new Error(`Pyodide initialization failed: ${error.message}`);
        }
    }

    setupEventListeners() {
        // Run button
        const runButton = document.getElementById('runButton');
        if (runButton) {
            runButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.runCode();
            });
        }

        // Theme toggle
        const themeButton = document.getElementById('themeToggle');
        if (themeButton) {
            themeButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });
        }

        // Font size controls
        const fontIncrease = document.getElementById('fontIncrease');
        const fontDecrease = document.getElementById('fontDecrease');
        
        if (fontIncrease) {
            fontIncrease.addEventListener('click', (e) => {
                e.preventDefault();
                this.changeFontSize(2);
            });
        }
        
        if (fontDecrease) {
            fontDecrease.addEventListener('click', (e) => {
                e.preventDefault();
                this.changeFontSize(-2);
            });
        }

        // Clear console
        const clearButton = document.getElementById('clearConsole');
        if (clearButton) {
            clearButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearConsole();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to run code
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.runCode();
            }
        });
    }

    async runCode() {
        if (this.isRunning || !this.pyodide || !this.editor) {
            return;
        }

        const code = this.editor.getValue().trim();
        if (!code) {
            this.appendToConsole('Please enter some Python code to run.', 'error');
            return;
        }

        this.isRunning = true;
        this.updateRunButton(true);
        this.updateStatus('Running...', 'warning');
        
        this.appendToConsole('\n--- Running Code ---', 'info');

        try {
            // Clear previous output
            this.pyodide.runPython('stdout_capture.get_output()');

            // Execute the code
            let result = this.pyodide.runPython(code);
            
            // Get captured output
            let output = this.pyodide.runPython('stdout_capture.get_output()');
            
            // Display output if any
            if (output && output.trim()) {
                this.appendToConsole(output.trim(), 'output');
            }

            // Display result if it's not None and there was no print output
            if (result !== undefined && result !== null && (!output || !output.trim())) {
                this.appendToConsole(`Result: ${result}`, 'result');
            }

            this.appendToConsole('--- Execution Complete ---\n', 'info');
            this.updateStatus('Executed successfully', 'success');

        } catch (error) {
            console.error('Python execution error:', error);
            
            let errorMessage = error.toString();
            // Clean up error message
            if (errorMessage.includes('Traceback')) {
                const lines = errorMessage.split('\n');
                const cleanLines = lines.filter(line => 
                    line.trim() && 
                    !line.includes('<exec>') && 
                    !line.includes('File "<exec>", line 1')
                );
                errorMessage = cleanLines.join('\n');
            }
            
            this.appendToConsole(`Error: ${errorMessage}`, 'error');
            this.updateStatus('Execution error', 'error');
        } finally {
            this.isRunning = false;
            this.updateRunButton(false);
            
            // Reset status after delay
            setTimeout(() => {
                if (!this.isRunning) {
                    this.updateStatus('Ready', 'success');
                }
            }, 2000);
        }
    }

    appendToConsole(text, type = 'output') {
        const consoleEl = document.getElementById('console');
        if (!consoleEl) return;

        const outputDiv = document.createElement('div');
        outputDiv.className = `console-${type}`;
        
        switch (type) {
            case 'error':
                outputDiv.innerHTML = `🚫 ${this.escapeHtml(text)}`;
                outputDiv.style.color = 'var(--color-error)';
                break;
            case 'result':
                outputDiv.innerHTML = `📤 ${this.escapeHtml(text)}`;
                outputDiv.style.color = 'var(--color-success)';
                outputDiv.style.fontWeight = 'bold';
                break;
            case 'info':
                outputDiv.innerHTML = this.escapeHtml(text);
                outputDiv.style.color = 'var(--color-text-secondary)';
                outputDiv.style.fontStyle = 'italic';
                break;
            default:
                outputDiv.textContent = text;
                break;
        }
        
        consoleEl.appendChild(outputDiv);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    clearConsole() {
        const consoleEl = document.getElementById('console');
        if (consoleEl) {
            consoleEl.innerHTML = '<div class="console-welcome">Console cleared! Ready for new output 🧹<br><br></div>';
        }
    }

    updateRunButton(isRunning) {
        const button = document.getElementById('runButton');
        if (!button) return;

        button.disabled = isRunning;
        
        if (isRunning) {
            button.textContent = '⏸️ Running...';
            button.classList.add('running');
        } else {
            button.textContent = '▶️ Run';
            button.classList.remove('running');
        }
    }

    updateStatus(message, type) {
        const status = document.getElementById('editorStatus');
        if (status) {
            status.textContent = message;
            status.className = `status status--${type}`;
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('pythonide-theme', this.theme);
        this.applyTheme();
    }

    changeFontSize(delta) {
        this.fontSize = Math.max(10, Math.min(24, this.fontSize + delta));
        
        if (this.editor) {
            this.editor.updateOptions({ fontSize: this.fontSize });
        }
        
        localStorage.setItem('pythonide-fontsize', this.fontSize.toString());
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the IDE when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Python IDE...');
    window.pythonIDE = new PythonIDE();
});

// Global error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});