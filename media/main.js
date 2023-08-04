// @ts-ignore 

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();

  let response = '';
  let response1;

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

  const checkSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-license="isc-gnc" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`;

  const cancelSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-license="isc-gnc" stroke-width="1.5" stroke="currentColor" class="w-3 h-3 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;

  const sendSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-license="isc-gnc" stroke-width="1.5" stroke="currentColor" class="w-3 h-3 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>`;

  const pencilSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-license="isc-gnc" stroke-width="2" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>`;

  const plusSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-license="isc-gnc" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`;

  const insertSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-license="isc-gnc" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>`;

  const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" stroke="currentColor" fill="none" data-license="isc-gnc" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" ><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;

  const closeSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-license="isc-gnc" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;

  const refreshSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" data-license="isc-gnc" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>`;


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
      case "clearResponse": {
        response = '';
        break;
      }
      case "setPrompt": {
        document.getElementById("prompt-input").value = message.value;
        break;
      }
    }
  });

  function fixCodeBlocks(response) {
  // Use a regular expression to find all occurrences of the substring in the string
  const REGEX_CODEBLOCK = new RegExp('\`\`\`', 'g');
  const matches = response.match(REGEX_CODEBLOCK);

  // Return the number of occurrences of the substring in the response, check if even
  const count = matches ? matches.length : 0;
  if (count % 2 === 0) {
    return response;
  } else {
    // else append ``` to the end to make the last code block complete
    return response.concat('\n\`\`\`');
  }

  }

  function addQuestion() {
    const list = document.getElementById("qa-list");
    list.classList.remove("hidden");
    // document.getElementById("introduction")?.classList?.add("hidden");
    // document.getElementById("conversation-list").classList.add("hidden");

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
          ? response1.value
          : response1.value + "\n\n```\n\n";
        
    const markedResponse = marked.parse(updatedValue);

    list.innerHTML += `<div class="p-4 self-end mt-4 question-element-ext relative input-background">
                        <h2 class="mb-5 flex" data-license="isc-gnc">${userSvg}You</h2>
                        <no-export class="mb-2 flex items-center" data-license="isc-gnc">
                            <button title="Edit and resend this prompt" class="resend-element-ext p-1.5 flex items-center rounded-lg absolute right-6 top-6">${pencilSvg}</button>
                            <div class="hidden send-cancel-elements-ext flex gap-2">
                                <button title="Send this prompt" class="send-element-ext p-1 pr-2 flex items-center">${sendSvg}&nbsp;Send</button>
                                <button title="Cancel" class="cancel-element-ext p-1 pr-2 flex items-center">${cancelSvg}&nbsp;Cancel</button>
                            </div>
                        </no-export>
                        <div class="overflow-y-auto">${markedResponse}</div>
                    </div>`;

    if (response1.autoScroll) {
      list.lastChild?.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
    }
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
      list.innerHTML += `<div data-license="isc-gnc" class="p-4 self-end mt-4 pb-8 answer-element-ext">
                        <h2 class="mb-5 flex">${aiSvg}ChatGPT</h2>
                        <div class="result-streaming" id="${response1.id}">${markedResponse}</div>
                    </div>`;
    }

    if (response1.done) {
      const preCodeList = list.lastChild.querySelectorAll("pre > code");

      preCodeList.forEach((preCode) => {
        preCode.classList.add(
          "input-background",
          "p-4",
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

  // Listen for keyup events on the prompt input element
  promptInput.addEventListener('keydown', (e) => {
    const { keyCode, ctrlKey, shiftKey } = e;
  
    if (keyCode === 13 && !ctrlKey && !shiftKey) {
      e.preventDefault();
      vscode.postMessage({
        type: 'prompt',
        value: promptInput.value
      });
    }
  });

  document.getElementById('ask-button').addEventListener('click', (e) => {
    vscode.postMessage({
      type: 'prompt',
      value: this.value
    });
  });

  document.getElementById('settings-button').addEventListener('click', (e) => {
    vscode.postMessage({
      type: 'openSettings',
    });
  });

})();
