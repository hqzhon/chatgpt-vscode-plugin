
export function formatString(template: string, ...args: any[]): string {
    return template.replace(/{(\d+)}/g, (match, index) => {
      const argIndex = parseInt(index);
      return args[argIndex] !== undefined ? args[argIndex].toString() : match;
    });
  }