const vscode = acquireVsCodeApi();
      const executeBtn = document.getElementById('executeBtn');
      const overlay = document.getElementById('overlay');
      const toast = document.getElementById('toast');
      const themeToggle = document.getElementById('themeToggle');
      const select = document.getElementById('actionSelect');
      let darkMode = true;
  
      window.onload = () => {
        select.focus();
      }
  
      executeBtn.addEventListener('click', () => {
        const selectedAction = select.value;
        if (!selectedAction) {
          showToast('⚠ Please select an action!', '#ff5555');
          return;
        }
        showLoading();
        vscode.postMessage({ command: selectedAction });
      });
  
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') executeBtn.click();
      });
  
      function showLoading() {
        overlay.style.display = 'flex';
      }
  
      function stopLoading() {
        overlay.style.display = 'none';
      }
  
      function showToast(message, color) {
        toast.textContent = message;
        toast.style.backgroundColor = color || '#00b7ff';
        toast.className = "toast show";
        setTimeout(() => { toast.className = "toast"; }, 2500);
      }
  
      window.addEventListener('message', event => {
        const message = event.data;
        stopLoading();
        if (message.command === 'showSuggestion') {
          document.getElementById('suggestion').textContent = message.suggestion;
          showToast('✅ Operation Successful!', '#22bb33');
        } else if (message.command === 'error') {
          document.getElementById('suggestion').textContent = '❌ No suggestion.';
          showToast('❌ ' + message.text, '#ff5555');
        }
        else if (message.command === 'validationError') {
          document.getElementById('suggestion').textContent = '❌ No suggestion.';
          showToast('❌ ' + message.text, '#ff5555');
        }
      });
  
      themeToggle.addEventListener('click', () => {
        darkMode = !darkMode;
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        themeToggle.textContent = darkMode ? '🌙' : '☀';
      });
