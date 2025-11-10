
export type TutorialStep = {
    title: string;
    description: string;
};

export type Tutorial = {
    title: string;
    steps: TutorialStep[];
};

export const TUTORIALS: Record<string, Tutorial> = {
    welcome: {
        title: "Welcome to AetherOS!",
        steps: [
            {
                title: "Welcome to AetherOS!",
                description: "This is a quick tour to get you started with your new AI-native operating system."
            },
            {
                title: "The Command Palette",
                description: "Press Cmd/Ctrl + K to open the Command Palette. This is your primary way to interact with the OS. Try asking it to 'open the code editor' or 'I need an image of a cat'."
            },
            {
                title: "The Dock",
                description: "The dock at the bottom of the screen contains all your available applications. Click any icon to launch an app."
            },
            {
                title: "Window Management",
                description: "You can drag windows by their title bar, resize them from the bottom-right corner, and manage them just like a traditional desktop OS."
            },
            {
                title: "You're All Set!",
                description: "Enjoy exploring AetherOS. Remember to use the Command Palette for any task you have in mind."
            }
        ],
    },
    'code-editor': {
        title: "Code Editor Tutorial",
        steps: [
            {
                title: "Intelligent Code Editor",
                description: "This is more than a text editor. You can generate, refactor, and improve code using the Aether-Architect panel on the right."
            },
            {
                title: "Saving Files",
                description: "Files are saved to your personal cloud storage. Use the 'Save' button or open a file from the File Explorer to get started."
            }
        ]
    },
    'file-explorer': {
        title: "File Explorer Tutorial",
        steps: [
            {
                title: "Cloud File System",
                description: "All your files are stored securely in the cloud. You can create, upload, and delete files and folders here."
            },
            {
                title: "Semantic Search",
                description: "Use the search bar at the top to search for files using natural language, not just filenames. Try 'find my component from yesterday'."
            }
        ]
    }
};
