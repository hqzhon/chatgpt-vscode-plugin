import * as vscode from 'vscode';

const commandInfoJson = [
    {
        name:  "explain",
        description: "Explain the selected code",
        promptPrefix: "promptPrefix.explain",
        prompt: "Please explain the following code."
    },
    {
        name: "refactor",
        description: "Refactor the selected code",
        promptPrefix: "promptPrefix.refactor",
        prompt: "Please refactor the following code to improve its readability and maintainability."
    },
    {
        name: "findProblems",
        description: "Find the selected code's problems",
        promptPrefix: "promptPrefix.findProblems",
        prompt: "Please find problems with the following code. \
        - fix them and explain what was wrong.\
        - Do not change anything else."
    },
    {
        name: "optimize",
        description: "Optimize the selected code",
        promptPrefix: "promptPrefix.optimize",
        prompt: "Please optimize the following code to improve its performance.\
        - Minimize unnecessary operations: Review the code and identify any redundant or unnecessary operations. Eliminate or simplify them to improve efficiency.\
        - Implement efficient algorithms: Analyze the code and explore more efficient algorithms or data structures that can achieve the same result with better performance. This could involve replacing loops with vectorized operations, utilizing built-in functions, or implementing more optimized algorithms for specific tasks.\
        - Reduce I/O operations: Minimize the number of input/output (I/O) operations, such as reading from or writing to disk, as they tend to be slower compared to in-memory operations. Group I/O operations together or use techniques like buffering to optimize performance.\
        - Employ caching mechanisms: If certain calculations or data retrieval operations are repeated, consider implementing caching mechanisms to store intermediate results or frequently accessed data. This can help avoid redundant computations and improve overall speed.\
        - Parallelize computations: Explore opportunities to parallelize computations by utilizing multi-threading, multiprocessing, or distributed computing techniques. This can enable the code to utilize multiple CPU cores or even multiple machines to perform calculations simultaneously.\
        - Profile and benchmark the code: Use profiling tools to identify performance bottlenecks and areas where optimization efforts can be focused. Benchmarking can help compare different optimization strategies to determine the most effective approach.\
        - Use appropriate data types: Choose the appropriate data types that are best suited for the task at hand. For example, using an array instead of a linked list can improve performance in situations where random access is required.\
        - Optimize memory usage: Minimize memory usage by avoiding unnecessary allocations and deallocations, reusing objects where possible, and using data structures that consume less memory.\
        - Use lazy initialization: Delay the initialization of objects or components until they are actually needed. This can help reduce unnecessary overhead and improve performance.\
        - Optimize network requests: Reduce the number of network requests by combining multiple requests into a single call, compressing data, or implementing caching mechanisms. Use asynchronous requests where possible to minimize blocking and improve performance."
    },
    {
        name: "comments",
        description: "Add comments for the selected code",
        promptPrefix: "promptPrefix.addComments",
        prompt: "Please add comments for the following code to enhance its readability and maintainability. \
        Requirements: \
        - It is essential to refrain from modifying the source code. \
        - The comments should be explicit and succinct, aiding in the comprehension of the code's functionality and reasoning by other readers.\
        - When writing functions or classes, summarise the purpose of the code and explain the input parameters and return values.\
        - Add line breaks. Not every single line requires a comment.\
        - Amend the code as necessary to enhance legibility.\
        - Kindly furnish the code together with remarks.\
        Here is an example:\
        \"\"\"\
        def function_class_name(parameter1,parameter2):\
            \"\"\"\
            总结该函数的用途。\
            \
            参数：\
            parameter1 -- 参数1说明\
            parameter2 -- 参数2说明\
            \
            返回值：\
            result -- 返回值说明\
            \"\"\"\
            \
            # 代码段用途注释\
            total = 0\
            count = len(number_list)\
            \
            # 循环用途注释\
            for number in number_list:\
                total += number\
            \
            # 返回值\
            return result\
        \"\"\""
    },
    {
        name: "translate",
        description: "Translate the selected code's comments",
        promptPrefix: "promptPrefix.translate",
        prompt: "Please translate the following code into {{0}}.\
        - including code comments,excluding code logic and code print log info. \
        - return code with markdown format"
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

export function getCommand(commandName: string) {
    for (let i = 0; i < commandInfoJson.length; i++) {
        const commandInfo = JSON.parse(JSON.stringify(commandInfoJson[i]));
        const name: string = commandInfo.name;
        if (name.trim().toLowerCase() === commandName.trim().toLowerCase()) {
            return commandInfo;
        }
    }
    return null;
}

export function getCommands() {
    const result = [];

    for (let i = 0; i < commandInfoJson.length; i++) {
        const commandInfo = JSON.parse(JSON.stringify(commandInfoJson[i]));
        result.push(commandInfo);
    }

    return result;
}