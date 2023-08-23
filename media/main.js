// @ts-ignore 

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();

  let username = '';
  let response1;
  let _commandInfo = [];

  marked.setOptions({
    renderer: new marked.Renderer(),
    highlight: function (code, _lang) {
      return hljs.highlightAuto(code).value;
    },
    langPrefix: "hljs language-",
    pedantic: false,
    gfm: true,
    breaks: true,
    sanitize: false,
    smartypants: false,
    xhtml: false,
  });

  const aiSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-license="isc-gnc" stroke-width="1.5" stroke="currentColor" class="w-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z"></path></svg>`;
  const userSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-license="isc-gnc" stroke-width="1.5" stroke="currentColor" class="w-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`;
  const clipboardSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-license="isc-gnc" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>`;
  const plusSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-license="isc-gnc" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`;
  const insertSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-license="isc-gnc" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>`;

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const message = event.data;
    
    switch (message.type) {
      case "setResponse": {
        response1 = message;
        addResponse();
        break;
      }
      case "addQuestion": {
        response1 = message;
        addQuestion();
        break;
      }
      case "setPrompt": {
        document.getElementById("prompt-input").value = message.value;
        break;
      }
      case "showStopButton": {
        showStopButton();
        break;
      }
      case "hideStopButton": {
        hideStopButton();
        break;
      }
      case "clearChatHistory": {
        document.getElementById("qa-list").innerHTML = '';
        setDefaultText();
        break;
      }
      case "showNextProblem": {
        showNextProblem();
        var nextProblem = document.getElementById("next-problem-text");
        nextProblem.innerHTML = message.value;
        break;
      }
      case "setCommands": {
        _commandInfo = message.value;
        break;
      }
      case "setDefaultText": {
        username = message.value;
        setDefaultText();
        break;
      }
    }
  });

  document.getElementById("qa-list").addEventListener("click", (e) => {
    if (e.target.id === "showCode") {
      const codeInfo = e.target.parentElement.querySelector("#codeInfo");
      codeInfo.classList.remove("hidden");
      e.target.classList.add("hidden");
    }
  });

  function setDefaultText() {
    console.log('setDefaultText');
    const list = document.getElementById("qa-list");
    list.classList.remove("hidden");
    list.innerHTML += `<div class="p-2 input-background">
                        <h2 class="mb-5 flex" data-license="isc-gnc">${aiSvg}ChatGPT</h2>
                        <div class="overflow-y-auto defaultText">Hi ${username},  I'm your ChatGPT and I'm here to help you get things done faster. I can identify issues, explain and even improve code.
                        <br><br>I'm powered by AI, so surprises and mistakes are possible. Make sure to verify any generated code or suggestions, and <a href="https://github.com/hqzhon/chatgpt-vscode-plugin/issues">share feedback</a> so that we can learn and improve.</div>
                    </div>`;
  }

  function addQuestion() {
    hiddenNextProblem();
    const list = document.getElementById("qa-list");
    list.classList.remove("hidden");

    const escapeHtml = (unsafe) => {
      return unsafe
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&#039;", "'");
    };

    updatedValue =
      response1.value.split("```").length % 2 === 1
          ? response1.code
          : response1.code + "\n\n```\n\n";
        
    const markedResponse = marked.parse(updatedValue);

    list.innerHTML += `<div class="p-2 input-background">
                        <h2 class="mb-5 flex" data-license="isc-gnc">${userSvg}You</h2>
                        <div class="overflow-y-auto">${response1.value}</div>
                        <div class="overflow-y-auto hidden" id="codeInfo">${markedResponse}</div>
                        <div class="overflow-y-auto user-background p-2 pb-2 block whitespace-pre clickable" id="showCode">show code</div>
                    </div>`;
    if (response1.code === null || response1.code.length === 0) {
      list.lastChild.querySelector("#showCode").classList.add("hidden");
    }
    
    const preCodeList = list.lastChild.querySelectorAll("pre > code");
    preCodeList.forEach((preCode) => {
      preCode.classList.add(
        "user-background",
        "p-2",
        "pb-2",
        "block",
        "whitespace-pre",
        "overflow-x-scroll"
      );
      preCode.parentElement.classList.add("pre-code-element", "relative");
    });

    if (response1.autoScroll) {
      list.lastChild?.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
    }
    showInProgress();
  }

  function getFormatSelectedCode (code) {

  }

  function showNextProblem() {
    document.getElementById('next-problem').style.display = 'block';
  }

  function hiddenNextProblem() {
    document.getElementById('next-problem').style.display = 'none';
  }

  function showInProgress() {
    document.getElementById('in-progress').style.display = 'block';
  }

  function hiddenInProgress() {
    document.getElementById('in-progress').style.display = 'none';
  }

  function showStopButton() {
    document.getElementById('ask-button').style.display = 'none';
    document.getElementById('stop-button').style.display = 'inline';
  }

  function hideStopButton() {
    document.getElementById('ask-button').style.display = 'inline';
    document.getElementById('stop-button').style.display = 'none';
  }

  function addResponse() {
    const list = document.getElementById("qa-list");
    list.classList.remove("hidden");
    let existingMessage = document.getElementById(response1.id);
    let updatedValue = "";

    const unEscapeHtml = (unsafe) => {
      return unsafe
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    };

    if (!response1.responseInMarkdown) {
      updatedValue = "```\r\n" + unEscapeHtml(response1.value) + " \r\n ```";
    } else {
      updatedValue =
      response1.value.split("```").length % 2 === 1
          ? response1.value
          : response1.value + "\n\n```\n\n";
    }

    const markedResponse = marked.parse(updatedValue);

    if (existingMessage) {
      existingMessage.innerHTML = markedResponse;
    } else {
      hiddenInProgress();
      list.innerHTML += `<div data-license="isc-gnc" class="p-2 answer-element-ext">
                        <h2 class="mb-5 flex">${aiSvg}ChatGPT</h2>
                        <div class="result-streaming" id="${response1.id}">${markedResponse}</div>
                    </div>`;
    }

    if (response1.done) {
      const preCodeList = list.lastChild.querySelectorAll("pre > code");

      preCodeList.forEach((preCode) => {
        preCode.classList.add(
          "input-background",
          "p-2",
          "pb-2",
          "block",
          "whitespace-pre",
          "overflow-x-scroll"
        );
        preCode.parentElement.classList.add("pre-code-element", "relative");

        const buttonWrapper = document.createElement("no-export");
        buttonWrapper.classList.add(
          "code-actions-wrapper",
          "flex",
          "gap-3",
          "pr-2",
          "pt-1",
          "pb-1",
          "flex-wrap",
          "items-center",
          "justify-end",
          "rounded-t-lg",
          "input-background"
        );

        // Create copy to clipboard button
        const copyButton = document.createElement("button");
        copyButton.title = "Copy to clipboard";
        copyButton.innerHTML = `${clipboardSvg} Copy`;

        copyButton.classList.add(
          "code-element-ext",
          "p-1",
          "pr-2",
          "flex",
          "items-center",
          "rounded-lg"
        );

        const insert = document.createElement("button");
        insert.title = "Insert the below code to the current file";
        insert.innerHTML = `${insertSvg} Insert`;

        insert.classList.add(
          "edit-element-ext",
          "p-1",
          "pr-2",
          "flex",
          "items-center",
          "rounded-lg"
        );

        const newTab = document.createElement("button");
        newTab.title = "Create a new file with the below code";
        newTab.innerHTML = `${plusSvg} New`;

        newTab.classList.add(
          "new-code-element-ext",
          "p-1",
          "pr-2",
          "flex",
          "items-center",
          "rounded-lg"
        );

        // buttonWrapper.append(copyButton, insert, newTab);

        // if (preCode.parentNode.previousSibling) {
        //   preCode.parentNode.parentElement.insertAfter(
        //     buttonWrapper,
        //     preCode.parentElement.previousSibling
        //   );
        // } else {
        //   preCode.parentNode.parentElement.append(buttonWrapper);
        // }
      });

      existingMessage = document.getElementById(response1.id);
      existingMessage.classList.remove("result-streaming");
    }

    if (response1.autoScroll && (response1.done || markedResponse.endsWith("\n"))) {
      list.lastChild?.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
    }
  }

  const promptInput = document.getElementById('prompt-input');
  const popupMenu = document.getElementById('popupMenu');
  const popupMenuContent = document.getElementById('popupMenuContent');
  const grayTip = document.getElementById("grayTip");

  // Listen for keyup events on the prompt input element
  promptInput.addEventListener('keydown', (e) => {
    const { keyCode, ctrlKey, shiftKey } = e;
    console.log('keyCode: ' + keyCode);

    if (popupMenuContent.children.length > 0) {
      let selected = popupMenuContent.querySelector('.selected');
      if (keyCode === 13 && selected) {
        e.preventDefault();
        popupMenu.style.display = 'none';
        promptInput.value = "/" + selected.textContent + ' ';
        popupMenuContent.innerHTML = "";
        for (let i = _commandInfo.length - 1; i >= 0; i--) {
          let command = _commandInfo[i];
          if (command.name.toString().toLowerCase().startsWith(selected.textContent.trim().toLowerCase())) {
            grayTip.textContent = command.description;
            let rect = e.target.getBoundingClientRect();
            grayTip.style.left = rect.left + e.target.value.length * 7 + 'px';
            break;
          }
        }
        return;
      }
    }

    if (keyCode === 8) {
      popupMenuContent.innerHTML = "";
      let isAddSelected = false;
      for (let i = _commandInfo.length - 1; i >= 0; i--) {
        let command = _commandInfo[i];
        console.log('command: ' + command.name);
        if (command.name.toString().toLowerCase().startsWith(promptInput.value.substring(1).toLowerCase())) {
          let newOption = document.createElement('li');
          if (!isAddSelected) {
            newOption.classList.add('selected');
            isAddSelected = true;
          }
          newOption.textContent = command.name;
          popupMenuContent.appendChild(newOption);
          promptInput.focus();
        }
      }  
    }
  
    if (keyCode === 13 && !ctrlKey && !shiftKey) {
      if (promptInput.value.length === 0) {
        return;
      }
      e.preventDefault();
      vscode.postMessage({
        type: 'prompt',
        value: promptInput.value
      });
      promptInput.value = '';
      popupMenuContent.innerHTML = "";
      grayTip.textContent = "";
    }

    if (popupMenuContent.children.length > 0) {
      let selected = popupMenuContent.querySelector('.selected');
      if (keyCode === 38) {
        if (selected) {
          let prev = selected.previousElementSibling;
          if (prev) {
            selected.classList.remove('selected');
            prev.classList.add('selected');
          }
        } else {
          let last = popupMenuContent.lastElementChild;
          if (last) {
            last.classList.add('selected');
          }
        }
      } else if (keyCode === 40) {
        if (selected) {
          let next = selected.nextElementSibling;
          if (next) {
            selected.classList.remove('selected');
            next.classList.add('selected');
          }
        } else {
          let first = popupMenuContent.firstElementChild;
          if (first) {
            first.classList.add('selected');
          }
        }
      }
    }
  });

  promptInput.addEventListener('input', (e) => {
    popupMenuContent.innerHTML = "";
    grayTip.textContent = "";
    if (promptInput.value.startsWith('/')) {
      let textarea = e.target;
      let rect = textarea.getBoundingClientRect();
      popupMenu.style.display = 'block';
      popupMenu.style.left = rect.left + 'px';
      popupMenu.style.bottom = rect.height + 5 + 'px';
      grayTip.style.left = rect.left + e.target.value.length * 7 + 'px';

      console.log('_commandInfo: ' + _commandInfo);
      let isAddSelected = false;
      for (let i = _commandInfo.length - 1; i >= 0; i--) {
        let command = _commandInfo[i];
        console.log('command: ' + command.name);
        if (command.name.toString().toLowerCase().startsWith(promptInput.value.substring(1).toLowerCase())) {
          let newOption = document.createElement('li');
          if (!isAddSelected) {
            newOption.classList.add('selected');
            isAddSelected = true;
          }
          newOption.textContent = command.name;
          popupMenuContent.appendChild(newOption);
          promptInput.focus();
        }
      }      
    }
  });


  document.addEventListener('click', function(e) {
    let popupMenu = document.getElementById('popupMenu');
    if (e.target.closest('.popup-menu') !== popupMenu) {
        popupMenu.style.display = 'none';
    }
});

  document.getElementById('ask-button').addEventListener('click', (e) => {
    if (promptInput.value.length === 0) {
      return;
    }
    vscode.postMessage({
      type: 'prompt',
      value: promptInput.value
    });
    promptInput.value = '';
    popupMenuContent.innerHTML = "";
    grayTip.textContent = "";
  });

  document.getElementById('stop-button').addEventListener('click', (e) => {
    vscode.postMessage({
      type: 'stop',
      value: response1.id
    });
    hideStopButton();
    existingMessage = document.getElementById(response1.id);
    existingMessage.classList.remove("result-streaming");
    document.getElementById("qa-list").lastChild?.scrollIntoView({
      behavior: "smooth",
      block: "end",
      inline: "nearest",
    });
  });

  const nextProblem = document.getElementById('next-problem-text');
  nextProblem.addEventListener('click', (e) => {
    vscode.postMessage({
      type: 'prompt',
      value: nextProblem.textContent
    });
  });

})();
