import * as vscode from 'vscode';
import { ChatGPTAPI, ChatMessage } from 'chatgpt-vscode';


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
		const config = vscode.workspace.getConfiguration('chatgpt');
		const prompt = config.get(command) as string;
		provider.search(prompt);
	};

	// Register the commands that can be called from the extension's package.json
	const commandTranslateHandle = (command:string) => {
		const config = vscode.workspace.getConfiguration('chatgpt');
		const prompt = config.get(command) as string;
		const language = config.get('promptPrefix.translateLanguage') as string;
		const fullPrompt = provider.formatString(prompt, language);
		provider.search(fullPrompt);
	};

	const commandAsk = vscode.commands.registerCommand('chatgpt.ask', () => {
		vscode.window.showInputBox({ prompt: 'What do you want to do?' }).then((value) => {
			provider.search(value);
		});
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
		commandHandler('promptPrefix.explain');
	});
	const commandRefactor = vscode.commands.registerCommand('chatgpt.refactor', () => {
		commandHandler('promptPrefix.refactor');
	});
	const commandOptimize = vscode.commands.registerCommand('chatgpt.optimize', () => {
		commandHandler('promptPrefix.optimize');
	});
	const commandProblems = vscode.commands.registerCommand('chatgpt.findProblems', () => {
		commandHandler('promptPrefix.findProblems');
	});
	const commandAddComments= vscode.commands.registerCommand('chatgpt.addComments', () => {
		commandHandler('promptPrefix.addComments');
	});
	const commandTranslate = vscode.commands.registerCommand('chatgpt.translate', () => {
		commandTranslateHandle('promptPrefix.translate');
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

	public formatString(template: string, ...args: any[]): string {
		return template.replace(/{(\d+)}/g, (match, index) => {
		  const argIndex = parseInt(index);
		  return args[argIndex] !== undefined ? args[argIndex].toString() : match;
		});
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
				case 'openSettings':
					{
						vscode.commands.executeCommand('workbench.action.openSettings', "@ext:hqzhon.quick-chatgpt");
						break;
					}	
				case 'prompt':
					{
						this.search(data.value);
					}
			}
		});
	}



	public async search(prompt?:string) {
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
		var responseId; 
		var responseText;

		// Get the selected text of the active editor
		const selection = vscode.window.activeTextEditor?.selection;
		const selectedText = vscode.window.activeTextEditor?.document.getText(selection);
		let searchPrompt = '';

		if (selection && selectedText) {
			// If there is a selection, add the prompt and the selected text to the search prompt
			if (this.selectedInsideCodeblock) {
				searchPrompt = `${prompt}\n\`\`\`\n${selectedText}\n\`\`\``;
			} else {
				searchPrompt = `${prompt}\n${selectedText}\n`;
			}
		} else {
			// Otherwise, just use the prompt if user typed it
			searchPrompt = prompt;
		}

		this._fullPrompt = searchPrompt;


		if (!this._chatGPTAPI) {
			response = '[ERROR] Please enter an API key in the extension settings';
		} else {
			// If successfully signed in
			console.log("sendMessage");
			// Make sure the prompt is shown
			// this._view?.webview.postMessage({ type: 'setPrompt', value: this._prompt });

			console.log(this._view);
			if (this._view) {
				console.log(searchPrompt);
				this._view.webview.postMessage({ type: 'addQuestion', value: this._prompt, code: selectedText, autoScroll: true });
			}

			let agent = this._chatGPTAPI;

			try {
				// Send the search prompt to the ChatGPTAPI instance and store the response
				response = await agent.sendMessage(searchPrompt, {
					onProgress: (partialResponse) => {
						responseText = partialResponse.text;
						responseId = partialResponse.id;
						if (this._view && this._view.visible) {
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
			this._view.webview.postMessage({ 
				type: 'setResponse',  
				value: responseText, 
				done: true,
				id: responseId, 
				autoScroll: true, 
				responseInMarkdown: true 
			});
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
				    <div id="response" class="pt-6 text-sm"></div>

					<div class="flex-1 overflow-y-auto" id="qa-list" data-license="isc-gnc"></div>

					<div class="flex-1 overflow-y-auto hidden" id="conversation-list" data-license="isc-gnc"></div>


					<div id="in-progress" class="pl-4 pt-2 flex items-center hidden" data-license="isc-gnc">
						<div class="typing">Thinking</div>
						<div class="spinner">
							<div class="bounce1"></div>
							<div class="bounce2"></div>
							<div class="bounce3"></div>
						</div>

						<button id="stop-button" class="btn btn-primary flex items-end p-1 pr-2 rounded-md ml-5">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Stop responding</button>
					</div>

				    <div class="p-4 flex items-center pt-2" data-license="isc-gnc">
						<div class="flex-1 textarea-wrapper">
							<textarea
								type="text"
								rows="1" data-license="isc-gnc"
								id="prompt-input"
								placeholder="Ask a question..."
								onInput="this.parentNode.dataset.replicatedValue = this.value"></textarea>
						</div>
						<div id="question-input-buttons" class="right-6 absolute p-0.5 ml-5 flex items-center gap-2">
							<button id="settings-button" title="More actions" class="rounded-lg p-0.5" data-license="isc-gnc">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
							</button>

							<button id="ask-button" title="Submit prompt" class="ask-button rounded-lg p-0.5">
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
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