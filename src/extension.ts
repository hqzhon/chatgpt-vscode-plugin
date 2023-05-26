import * as vscode from 'vscode';
import { ChatGPTAPI, ChatMessage } from 'chatgpt';


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
	const commandTranslate = vscode.commands.registerCommand('chatgpt.translate', () => {
		commandTranslateHandle('promptPrefix.translate');
	});

	let commandResetConversation = vscode.commands.registerCommand('chatgpt.resetConversation', () => {
		provider.setConversationId();
	});
	

	context.subscriptions.push(commandAsk, commandConversationId, commandExplain, commandRefactor, commandOptimize, commandProblems, commandResetConversation, commandTranslate);



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
		
		var response ;

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
			this._view?.webview.postMessage({ type: 'setPrompt', value: this._prompt });

			if (this._view) {
				this._view.webview.postMessage({ type: 'addResponse', value: '...' });
			}

			let agent = this._chatGPTAPI;

			try {
				// Send the search prompt to the ChatGPTAPI instance and store the response
				response = await agent.sendMessage(searchPrompt, {
					onProgress: (partialResponse) => {
						if (this._view && this._view.visible) {
							this._view.webview.postMessage({ type: 'addResponse', value: partialResponse.text });
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
			this._view.webview.postMessage({ type: 'addResponse', value: response });
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {

		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
		const microlightUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scripts', 'microlight.min.js'));
		const tailwindUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scripts', 'showdown.min.js'));
		const showdownUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scripts', 'tailwind.min.js'));

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<script src="${tailwindUri}"></script>
				<script src="${showdownUri}"></script>
				<script src="${microlightUri}"></script>
				<style>
				.code {
					white-space : pre;
				</style>
			</head>
			<body>
				<input class="h-10 w-full text-white bg-stone-700 p-4 text-sm" type="text" id="prompt-input" />

				<div id="response" class="pt-6 text-sm">
				</div>

				<script src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}