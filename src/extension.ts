import * as vscode from 'vscode';
import { ChatGPTAPI, ChatMessage } from 'chatgpt-vscode';
import {v4 as uuidv4 } from 'uuid';
import { getCommands, getCommand } from './commandInfo';
import { formatString } from './utils/stringUtils';
import { userInfo } from 'os';

export function activate(context: vscode.ExtensionContext) {
	// Get the API session token from the extension's configuration
	const config = vscode.workspace.getConfiguration('chatgpt');
	const apiKey = config.get('apiKey') as string|undefined;
	const model = config.get('model') as string|undefined;
	const temperature = config.get('temperature') as number|undefined;
	const topP = config.get('top_p') as number | undefined;
	const maxTokens = config.get('maxTokens') as number| undefined;

	// Create a new ChatGPTViewProvider instance and register it with the extension's context
	const provider = new ChatGPTViewProvider(context.extensionUri);
	provider.setApiKey(apiKey);
	provider.setModel(model);
	provider.setTemperature(temperature);
	provider.setTopp(topP);
	provider.setMaxTokens(maxTokens);

	// Put configuration settings into the provider
	provider.selectedInsideCodeblock = config.get('selectedInsideCodeblock') || false;
	provider.pasteOnClick = config.get('pasteOnClick') || false;
	provider.keepConversation = config.get('keepConversation') || false;
	provider.timeoutLength = config.get('timeoutLength') || 60;

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ChatGPTViewProvider.viewType, provider,  {
			webviewOptions: { retainContextWhenHidden: true }
		})
	);

	// Register the commands that can be called from the extension's package.json
	const commandHandler = (command:string) => {
		let prompt = getCommand(command).prompt;
		let description = getCommand(command).description;
		if (command.trim().toLowerCase() === 'translate') {
			const config = vscode.workspace.getConfiguration('chatgpt');
			const language = config.get('promptPrefix.translateLanguage') as string;
			const fullPrompt = formatString(prompt, language);
			provider.search(fullPrompt, true, description);
		} else {
			provider.search(prompt, true, description);
		}				
	};

	const commandAsk = vscode.commands.registerCommand('chatgpt.ask', () => {
		vscode.window.showInputBox({ prompt: 'What do you want to do?' }).then((value) => {
			if (value) {
				provider.search(value);
			}
		});
	});
	const commandClear = vscode.commands.registerCommand('chatgpt.clearHistory', () => {
		provider.clearChatHistory();
	});
	const commandSettings = vscode.commands.registerCommand('chatgpt.settings', () => {
		vscode.commands.executeCommand('workbench.action.openSettings', "@ext:hqzhon.quick-chatgpt");
	});
	const commandConversationId = vscode.commands.registerCommand('chatgpt.conversationId', () => {
		vscode.window.showInputBox({ 
			prompt: 'Set Conversation ID or delete it to reset the conversation',
			placeHolder: 'conversationId (leave empty to reset)',
			value: provider.getConversationId()
		}).then((conversationId) => {
			if (!conversationId) {
				provider.setConversationId();
			} else {
				vscode.window.showInputBox({ 
					prompt: 'Set Parent Message ID',
					placeHolder: 'messageId (leave empty to reset)',
					value: provider.getParentMessageId()
				}).then((messageId) => {
					provider.setConversationId(conversationId, messageId);
				});
			}
		});
	});
	const commandExplain = vscode.commands.registerCommand('chatgpt.explain', () => {	
		commandHandler('explain');
	});
	const commandRefactor = vscode.commands.registerCommand('chatgpt.refactor', () => {
		commandHandler('refactor');
	});
	const commandOptimize = vscode.commands.registerCommand('chatgpt.optimize', () => {
		commandHandler('optimize');
	});
	const commandProblems = vscode.commands.registerCommand('chatgpt.findProblems', () => {
		commandHandler('findProblems');
	});
	const commandAddComments= vscode.commands.registerCommand('chatgpt.addComments', () => {
		commandHandler('comments');
	});
	const commandTranslate = vscode.commands.registerCommand('chatgpt.translate', () => {
		commandHandler('translate');
	});

	let commandResetConversation = vscode.commands.registerCommand('chatgpt.resetConversation', () => {
		provider.setConversationId();
	});
	

	context.subscriptions.push(commandAsk, commandConversationId, commandExplain, commandRefactor, commandOptimize, commandProblems, commandResetConversation, commandTranslate, commandAddComments);



	// Change the extension's session token when configuration is changed
	vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
		if (event.affectsConfiguration('chatgpt.apiKey')) {
			// Get the extension's configuration
			const config = vscode.workspace.getConfiguration('chatgpt');
			const apiKey = config.get('apiKey') as string|undefined;
			// add the new token to the provider
			provider.setApiKey(apiKey);

		} else if (event.affectsConfiguration('chatgpt.selectedInsideCodeblock')) {
			const config = vscode.workspace.getConfiguration('chatgpt');
			provider.selectedInsideCodeblock = config.get('selectedInsideCodeblock') || false;

		} else if (event.affectsConfiguration('chatgpt.pasteOnClick')) {
			const config = vscode.workspace.getConfiguration('chatgpt');
			provider.pasteOnClick = config.get('pasteOnClick') || false;

		} else if (event.affectsConfiguration('chatgpt.keepConversation')) {
			const config = vscode.workspace.getConfiguration('chatgpt');
			provider.keepConversation = config.get('keepConversation') || false;

		}else if (event.affectsConfiguration('chatgpt.timeoutLength')) {
			const config = vscode.workspace.getConfiguration('chatgpt');
			provider.timeoutLength = config.get('timeoutLength') || 60;
		} else if (event.affectsConfiguration('chatgpt.model')) {
			const config = vscode.workspace.getConfiguration('chatgpt');
			const model = config.get('model') as string|undefined;
			// add the new token to the provider
			provider.setModel(model);
		} else if (event.affectsConfiguration('chatgpt.temperature')) {
			const config = vscode.workspace.getConfiguration('chatgpt');
			const temperature = config.get('temperature') as number | undefined;
			provider.setTemperature(temperature);
		} else if (event.affectsConfiguration('chatgpt.top_p')) {
			const config = vscode.workspace.getConfiguration('chatgpt');
			const topP = config.get('top_p') as number | undefined;
			provider.setTopp(topP);
		} else if (event.affectsConfiguration('chatgpt.maxTokens')) {
			const config = vscode.workspace.getConfiguration('chatgpt');
			const maxTokens = config.get('maxTokens') as number | undefined;
			provider.setMaxTokens(maxTokens);
		}
	});
	vscode.workspace.onDidOpenTextDocument((event: vscode.TextDocument) => {
		console.log("onDidOpenTextDocument");
		provider.setCommands();
		provider.setDefaultText();
	});

}

class ChatGPTViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'chatgpt.chatView';

	private _view?: vscode.WebviewView;

	// This variable holds a reference to the ChatGPTAPI instance
	private _chatGPTAPI?: ChatGPTAPI;
	// private _conversation?: ChatGPTConversation;

	private _response?: string;
	private _prompt?: string;
	private _fullPrompt?: string;

	private _responseIdSet: Set<string> = new Set();
	private _lastResponseId?: string;


	public selectedInsideCodeblock = false;
	public pasteOnClick = true;
	public keepConversation = true;
	public timeoutLength = 60;
	private _apiKey?: string;
	private _model?: string;
	private _temperature?: number;
	private _topP?: number;
	private _maxTokens?: number;

	// In the constructor, we store the URI of the extension
	constructor(private readonly _extensionUri: vscode.Uri) {
		
	}
	
	// Set the session token and create a new API instance based on this token
	public setApiKey(apiKey?: string) {
		this._apiKey = apiKey;
		this._newAPI();
	}

	public setModel(model?: string) {
		this._model = model;
		this._newAPI();
	}

	public setTemperature(temperature?: number) {
		this._temperature = temperature;
		this._newAPI();
	}

	public setTopp(topP?: number) {
		this._topP = topP;
		this._newAPI();
	}

	public setMaxTokens(maxTokens?: number) {
		this._maxTokens = maxTokens;
		this._newAPI();
	}

	public setConversationId(conversationId?: string, parentMessageId?: string) {
		// if (!conversationId || !parentMessageId) {
		// 	this._conversation = this._chatGPTAPI?.getConversation();
		// } else if (conversationId && parentMessageId) {
		// 	this._conversation = this._chatGPTAPI?.getConversation({conversationId: conversationId, parentMessageId: parentMessageId});
		// }
	}

	public getConversationId() {
		return "";
		// return this._conversation?.conversationId;
	}
	public getParentMessageId() {
		return "";
		// return this._conversation?.parentMessageId;
	}

	// This private method initializes a new ChatGPTAPI instance, using api key if it is set
	private _newAPI() {
		if (!this._apiKey) {
			console.warn("Api key not set");
		} else if (!this._model || !this._temperature || !this._topP) {
           console.warn('model/temperature/top_p is not set');
		}else{
			this._chatGPTAPI = new ChatGPTAPI({
				apiKey: this._apiKey,
				completionParams: {
					model: this._model,
					temperature: this._temperature,
					top_p: this._topP,
					max_tokens: this._maxTokens,
				  },
			});
			// this._conversation = this._chatGPTAPI.getConversation();
		}
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		// set options for the webview
		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		// set the HTML for the webview
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// add an event listener for messages received by the webview
		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'codeSelected':
					{
						// do nothing if the pasteOnClick option is disabled
						if (!this.pasteOnClick) {
							break;
						}

						let code = data.value;
						code = code.replace(/([^\\])(\$)([^{0-9])/g, "$1\\$$$3");

						// insert the code as a snippet into the active text editor
						vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(code));
						break;
					}
				case 'prompt':
					{
						if (data.value.startsWith('/')) {
							let command = data.value.substring(1).toLowerCase();
							let commandInfo = getCommand(command);
						    if (!commandInfo || !commandInfo.prompt) {
							    this.search(data.value.substring(1) , true);
								return;
						    }
							let prompt = commandInfo.prompt;
							let description = commandInfo.description;
						    console.log("after prompt: " + prompt);
							if (command.trim().toLowerCase() === 'translate') {
								const config = vscode.workspace.getConfiguration('chatgpt');
		     	            	const language = config.get('promptPrefix.translateLanguage') as string;
		                  		const fullPrompt = formatString(prompt, language);
						  		this.search(fullPrompt, true, description);
							} else {
		     		            this.search(prompt, true, description);
							}
					 	} else {
						 	   this.search(data.value);
					   	}
					}
				case 'stop':
					{
						console.log("stop: " + data.value);
						this._responseIdSet.add(data.value);
					}
			}
		});
		this.setCommands();
		this.setDefaultText();
	}

	public async setCommands() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'setCommands', value: getCommands() });
		}
	}

	public async setDefaultText() {
	    let username:string = userInfo().username;
		if (this._view) {
			this._view.webview.postMessage({ 
				type: 'setDefaultText',  
				value: username, 
				done: true,
				id: uuidv4(), 
				autoScroll: true, 
				responseInMarkdown: true 
			});
		}
	}

	public async clearChatHistory() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'clearChatHistory', value: "", code: "", autoScroll: true });
		}
	}

	public getSelectedText(): string {
		// Get the selected text of the active editor
		const selection = vscode.window.activeTextEditor?.selection;
		const selectedText = vscode.window.activeTextEditor?.document.getText(selection);
		return selectedText || ''; 
	}

	public async search(prompt?:string, isNeedSelectCode: boolean = false, promptDescription: string = "") {
		this._prompt = prompt;
		if (!prompt) {
			prompt = '';
		};

		// Check if the ChatGPTAPI instance is defined
		if (!this._chatGPTAPI) {
			this._newAPI();
		}

		// focus gpt activity from activity bar
		if (!this._view) {
			await vscode.commands.executeCommand('chatgpt.chatView.focus');
		} else {
			this._view?.show?.(true);
		}
		
		var response: string| ChatMessage ;
		var responseId: string = ""; 
		var responseText;

		let searchPrompt = '';

		console.log("this.getSelectedText(): " + this.getSelectedText().length);

		if (this.getSelectedText().length > 0) {
			// If there is a selection, add the prompt and the selected text to the search prompt
			if (this.selectedInsideCodeblock) {
				searchPrompt = `${prompt}\n\`\`\`\n${this.getSelectedText()}\n\`\`\``;
			} else {
				searchPrompt = `${prompt}\n${this.getSelectedText()}\n`;
			}
		} else {
			if (isNeedSelectCode) {
				if (this._view) {
					this._view.show?.(true);
			        this._view.webview.postMessage({ 
				    type: 'setResponse',  
				    value: "Please select the code to excute.", 
				    done: true,
				    id: uuidv4(), 
				    autoScroll: true, 
				    responseInMarkdown: true 
			    });
				return;
				}
			}
			// Otherwise, just use the prompt if user typed it
			searchPrompt = prompt;
		}

		this._fullPrompt = searchPrompt;

		console.log("sendMessage, prompt: " + prompt);
		console.log(this._view);
		if (this._view) {
			console.log(searchPrompt);
			let code;
			if (this.getSelectedText().length > 0) {
				code = `\n\`\`\`\n${this.getSelectedText()}\n\`\`\``;
			} else {
				code = '';
			}
			if (promptDescription.length === 0) {
				promptDescription = prompt;
			}

			this._view.webview.postMessage({ type: 'addQuestion', value: promptDescription, code: code, autoScroll: true });
		}

		if (!this._chatGPTAPI) {
			response = '[ERROR] Please enter an API key in the extension settings';
			if (this._view) {
				this._view.show?.(true);
			    this._view.webview.postMessage({ 
				    type: 'setResponse',  
				    value: response, 
				    done: true,
				    id: uuidv4(), 
				    autoScroll: true, 
				    responseInMarkdown: true 
			    });
			}
		} else {
			let agent = this._chatGPTAPI;
			if (this._view && this._view.visible) {
				this._view.webview.postMessage({ type: 'showStopButton', value: "", code: "", autoScroll: true });
			}
			
			try {
				// Send the search prompt to the ChatGPTAPI instance and store the response
				response = await agent.sendMessage(searchPrompt, {
					parentMessageId: this._lastResponseId,
					onProgress: (partialResponse) => {
						responseText = partialResponse.text;
						responseId = partialResponse.id;
						this._lastResponseId = responseId;
						if (this._view && this._view.visible && !this._responseIdSet.has(responseId)) {
							this._view.webview.postMessage({ 
								type: 'setResponse',  
								value: responseText, 
								done: false,
								id: responseId, 
								autoScroll: true, 
								responseInMarkdown: true 
							});
						}
					},
					timeoutMs: this.timeoutLength * 1000
				});
			} catch (e) {
				console.error(e);
				response = `[ERROR] ${e}`;
			}
		}

		// Saves the response
		this._response = response.toString();

		// Show the view and send a message to the webview with the response
		if (this._view) {
			this._view.show?.(true);
			if (!this._responseIdSet.has(responseId)) {
				this._view.webview.postMessage({ 
					type: 'setResponse',  
					value: responseText, 
					done: true,
					id: responseId, 
					autoScroll: true, 
					responseInMarkdown: true 
				});
				this._getNextProblem(this._chatGPTAPI);
			} else {
				this._responseIdSet.delete(responseId);
			}

			this._view.webview.postMessage({ type: 'hideStopButton', value: "", code: "", autoScroll: true });
		}
	}

	private async _getNextProblem(agent?: ChatGPTAPI) {
		if (!agent) {
			return;
		}
		try {
			// Send the search prompt to the ChatGPTAPI instance and store the response
			var response: ChatMessage = await agent.sendMessage("Generate the next question by inference, format: {\"problem\": \"what|how\"}", {
				parentMessageId: this._lastResponseId,
				timeoutMs: this.timeoutLength * 1000,
				onProgress: (partialResponse) => {
					this._lastResponseId = partialResponse.id;
				},
			});
			if (this._view) {
				const responseText = JSON.parse(response.text);
				this._view.webview.postMessage({ type: 'showNextProblem', value: responseText["problem"] });
			}
		} catch (e) {
			console.error(e);
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {

		const stylesMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
		const microlightUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scripts', 'microlight.min.js'));
		const showdownUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scripts', 'showdown.min.js'));
		const tailwindUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scripts', 'tailwind.min.js'));
		const vendorMarkedJs = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scripts', 'marked.min.js'));
		const vendorTurndownJs = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scripts', 'turndown.js'));
		const vendorHighlightCss = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scripts', 'highlight.min.css'));
		const vendorHighlightJs = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scripts', 'highlight.min.js'));

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<script src="${tailwindUri}"></script>
				<script src="${showdownUri}"></script>
				<script src="${microlightUri}"></script>
				<script src="${vendorMarkedJs}"></script>
				<script src="${vendorTurndownJs}"></script>
				<script src="${vendorHighlightJs}"></script>
				<link href="${stylesMainUri}" rel="stylesheet">
				<link href="${vendorHighlightCss}" rel="stylesheet">
				<style>
				.code {
					white-space : pre;
				</style>
			</head>
			<body class="overflow-hidden">
			    <div class="flex flex-col h-screen">

					<div class="flex-1 overflow-y-auto" id="qa-list" data-license="isc-gnc"></div>

					<div class="flex-1 overflow-y-auto hidden" id="conversation-list" data-license="isc-gnc"></div>

					<div id="next-problem" class="pl-4 pt-2 flex items-center hidden" data-license="isc-gnc">
						<div id="next-problem-text" class="next-problem clickable"></div>
					</div>

					<div id="in-progress" class="pl-4 pt-2 flex items-center hidden" data-license="isc-gnc">
						<div class="spinner">
							<div class="bounce1"></div>
							<div class="bounce2"></div>
							<div class="bounce3"></div>
						</div>	
					</div>

					<div id="popupMenu" class="popup-menu">
						<ul id="popupMenuContent">
                    </div>

				    <div class="p-2 flex items-center pt-2" data-license="isc-gnc">
						<div class="flex-1 textarea-wrapper textarea-container">
							<textarea
								type="text"
								rows="1" data-license="isc-gnc"
								id="prompt-input"
								placeholder="Ask a question or type '/' for topics"
								onInput="this.parentNode.dataset.replicatedValue = this.value"></textarea>
							<span class="gray-tip" id="grayTip"></span>
						</div>
						<div id="question-input-buttons" class="right-6 absolute p-0.5 ml-5 flex items-center gap-2">
							<button id="ask-button" title="Submit prompt" class="ask-button rounded-lg p-0.5">
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
							</button>
							<button id="stop-button" class="stop-button rounded-lg p-0.5" style="display: none;" title="Stop Typing">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
							</button>
						</div>
				    </div>
				</div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}