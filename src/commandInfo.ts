import * as vscode from 'vscode';

const commandInfoJson = [
    {
        name:  "explain",
        description: "chatgpt.explain",
        promptPrefix: "promptPrefix.explain"
    },
    {
        name: "refactor",
        description: "chatgpt.refactor",
        promptPrefix: "promptPrefix.refactor"
    },
    {
        name: "findProblems",
        description: "chatgpt.findProblems",
        promptPrefix: "promptPrefix.findProblems"
    },
    {
        name: "optimize",
        description: "chatgpt.optimize",
        promptPrefix: "promptPrefix.optimize"
    },
    {
        name: "comments",
        description: "chatgpt.addComments",
        promptPrefix: "promptPrefix.addComments"
    },
    {
        name: "translate",
        description: "chatgpt.translate",
        promptPrefix: "promptPrefix.translate"
    },
];


export function getCommandNames(inputStr: String) {
    const input = inputStr.toLowerCase();
    const result: String[] = [];

    for (let i = 0; i < commandInfoJson.length; i++) {
        const commandInfo = JSON.parse(JSON.stringify(commandInfoJson[i]));
        const name = commandInfo.name;

        if (input.length === 0 || name.toLowerCase().includes(input)) {
            result.push(name);
        }
    }

    return result;
}

export function getPromptPrefix(commandName: string): string {
    for (let i = 0; i < commandInfoJson.length; i++) {
        const commandInfo = JSON.parse(JSON.stringify(commandInfoJson[i]));
        const name: string = commandInfo.name;
        const promptPrefix: string = commandInfo.promptPrefix;
        if (name.trim().toLowerCase() === commandName.trim().toLowerCase()) {
            console.log("promptPrefix: " + promptPrefix);
            return promptPrefix;
        }
    }
    return "";
}

export function getCommands() {
    const result = [];

    for (let i = 0; i < commandInfoJson.length; i++) {
        const commandInfo = JSON.parse(JSON.stringify(commandInfoJson[i]));
        result.push(commandInfo.name);
    }

    return result;
}