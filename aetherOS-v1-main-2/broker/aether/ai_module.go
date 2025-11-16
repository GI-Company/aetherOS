
package aether

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"google.golang.org/api/option"
	"google.golang.org/genai"
)

// AIModule handles interactions with the Gemini API.
type AIModule struct {
	client *genai.Client
}

// NewAIModule creates a new AI module.
func NewAIModule() (*AIModule, error) {
	ctx := context.Background()
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY environment variable not set")
	}
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create genai client: %w", err)
	}
	return &AIModule{client: client}, nil
}

// GenerateText generates text from a given prompt.
func (m *AIModule) GenerateText(prompt string) (string, error) {
	ctx := context.Background()
	model := m.client.GenerativeModel("gemini-1.5-flash")
	// The user prompt is now passed as data, not as a direct instruction.
	fullPrompt := fmt.Sprintf("The user provided the following prompt: %s", prompt)
	resp, err := model.GenerateContent(ctx, genai.Text(fullPrompt))

	if err != nil {
		return "", fmt.Errorf("error generating content: %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content found in response")
	}

	var resultText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			resultText += string(txt)
		}
	}

	if resultText == "" {
		return "", fmt.Errorf("no text content found in response parts")
	}

	return resultText, nil
}

// GenerateWebPage generates HTML content for a simulated web page.
func (m *AIModule) GenerateWebPage(topic string) (string, error) {
	ctx := context.Background()
	model := m.client.GenerativeModel("gemini-1.5-flash")
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text(`You are an AI that functions as a web page content synthesizer for a simulated browser.
Your task is to generate the HTML body content for a given topic or URL.
- The HTML should be well-structured and semantic.
- Use Tailwind CSS classes for styling (e.g., 'text-2xl', 'font-bold', 'p-4', 'bg-card', 'rounded-lg').
- Do NOT include <html>, <head>, or <body> tags. Return only the content that would go inside the <body> tag.
- Keep the content concise and focused on the topic. A few paragraphs and maybe a list is sufficient.
- Do NOT use any <script> tags or inline JavaScript.`),
		},
	}
	prompt := fmt.Sprintf("Topic: %s", topic)
	resp, err := model.GenerateContent(ctx, genai.Text(prompt))

	if err != nil {
		return "", fmt.Errorf("error generating web page: %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content found in response")
	}

	var resultText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			resultText += string(txt)
		}
	}

	// The model sometimes returns the content wrapped in a JSON-like structure.
	// We attempt to parse it, but fall back to using the raw text.
	var parsedResp struct {
		HTMLContent string `json:"htmlContent"`
	}
	if err := json.Unmarshal([]byte(resultText), &parsedResp); err == nil && parsedResp.HTMLContent != "" {
		return parsedResp.HTMLContent, nil
	}

	return resultText, nil
}

// DesignComponent generates React component code from a prompt.
func (m *AIModule) DesignComponent(prompt string) (string, error) {
	ctx := context.Background()
	model := m.client.GenerativeModel("gemini-1.5-flash")
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text("You are a UI element code generator. Generate a React component using TypeScript, Next.js, and Tailwind CSS for the UI element described in the prompt.\n  - Use functional components and hooks.\n  - Use shadcn/ui components where appropriate (e.g., Button, Card, Input).\n  - Do not include any imports that are not used in the component.\n  Return only the raw TypeScript code for the component. Do not include any explanatory text or markdown formatting like '` + "```" + `tsx'."),
		},
	}

	fullPrompt := fmt.Sprintf("Prompt: %s", prompt)
	resp, err := model.GenerateContent(ctx, genai.Text(fullPrompt))

	if err != nil {
		return "", fmt.Errorf("error designing component: %w", err)
	}
	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content found in response")
	}
	var resultText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			resultText += string(txt)
		}
	}

	return resultText, nil
}

// SemanticFileSearch searches for files based on a natural language query.
func (m *AIModule) SemanticFileSearch(query string, availableFiles []string) (string, error) {
	ctx := context.Background()
	model := m.client.GenerativeModel("gemini-1.5-flash")
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text(`You are a semantic file search engine. Given a user's query and a list of available file paths, identify the most relevant files.
- Analyze the user's query for intent, keywords, file types, and potential date references (like "yesterday" or "last week").
- Match this against the provided file paths.
- Return a JSON object with a 'results' key, which is an array of objects. Each object should have a 'path' and 'type' ('file' or 'folder').
- If no files seem relevant, return an empty 'results' array.
- Do not include files in the result that are not in the provided 'availableFiles' list.
- Prioritize accuracy. It is better to return fewer, more relevant results than many irrelevant ones.
Example Output: {"results": [{"path": "/home/user/documents/report.docx", "type": "file"}]}`),
		},
	}

	filesJSON, err := json.Marshal(availableFiles)
	if err != nil {
		return "", fmt.Errorf("failed to marshal available files: %w", err)
	}

	fullPrompt := fmt.Sprintf("Query: '%s'\nAvailable Files: %s", query, string(filesJSON))
	resp, err := model.GenerateContent(ctx, genai.Text(fullPrompt))

	if err != nil {
		return "", fmt.Errorf("error during semantic search: %w", err)
	}
	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content found in search response")
	}
	var resultText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			resultText += string(txt)
		}
	}

	// Clean the response
	cleanedJSON := resultText
	if strings.HasPrefix(cleanedJSON, "```json") {
		cleanedJSON = strings.TrimPrefix(cleanedJSON, "```json")
		cleanedJSON = strings.TrimSuffix(cleanedJSON, "```")
	}
	cleanedJSON = strings.TrimSpace(cleanedJSON)

	// Validate JSON
	var temp interface{}
	if err := json.Unmarshal([]byte(cleanedJSON), &temp); err != nil {
		return "", fmt.Errorf("model returned invalid JSON: %w. Response: %s", err, cleanedJSON)
	}

	return cleanedJSON, nil
}

// GenerateAdaptivePalette generates a color palette from a description.
func (m *AIModule) GenerateAdaptivePalette(description string) (string, error) {
	ctx := context.Background()
	model := m.client.GenerativeModel("gemini-1.5-flash")
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text(`You are a color theme generator. Your task is to generate a JSON object representing a color palette based on a user's description.
The JSON object must contain the following keys, each with a hex color code as its value: "primaryColor", "secondaryColor", "backgroundColor", "textColor", "accentColor".
- backgroundColor: The main background color, should be dark.
- textColor: The main text color, should have good contrast with the background.
- primaryColor: A primary color for main UI elements.
- secondaryColor: A secondary color for less prominent elements.
- accentColor: An accent color for highlights and important actions.
Return only the raw JSON object. Do not include any explanatory text or markdown formatting like '` + "```" + `json'.`),
		},
	}
	resp, err := model.GenerateContent(ctx, genai.Text(description))
	if err != nil {
		return "", fmt.Errorf("error generating palette: %w", err)
	}
	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content found in palette response")
	}
	var resultText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			resultText += string(txt)
		}
	}
	return resultText, nil
}

// GenerateAccentColor generates an accent color from a description.
func (m *AIModule) GenerateAccentColor(description string) (string, error) {
	ctx := context.Background()
	model := m.client.GenerativeModel("gemini-1.5-flash")
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text(`You are a color generator. Your task is to generate a JSON object with a single key "accentColor" based on a user's description. The value should be a hex color code. Return only the raw JSON object.`),
		},
	}

	resp, err := model.GenerateContent(ctx, genai.Text(description))
	if err != nil {
		return "", fmt.Errorf("error generating accent color: %w", err)
	}
	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content found in accent color response")
	}
	var resultText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			resultText += string(txt)
		}
	}
	return resultText, nil
}

// SummarizeCode generates a one-sentence summary of a code snippet.
func (m *AIModule) SummarizeCode(code string) (string, error) {
	ctx := context.Background()
	model := m.client.GenerativeModel("gemini-1.5-flash")
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text("You are an expert code summarizer. Your task is to provide a single, concise sentence that describes the purpose of the provided code snippet. Focus on the high-level functionality. Do not describe the syntax. Return a JSON object with a single key 'summary'."),
		},
	}
	prompt := fmt.Sprintf("Code: ```\n%s\n```", code)
	resp, err := model.GenerateContent(ctx, genai.Text(prompt))

	if err != nil {
		return "", fmt.Errorf("error summarizing code: %w", err)
	}
	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content found in summary response")
	}
	var resultText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			resultText += string(txt)
		}
	}
	return resultText, nil
}

// GenerateTaskGraph generates a multi-step task plan from a user prompt.
func (m *AIModule) GenerateTaskGraph(prompt string) (string, error) {
	ctx := context.Background()
	model := m.client.GenerativeModel("gemini-1.5-flash")
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{
			genai.Text(`You are an AI task planner for an operating system. Your job is to convert a user's request into a structured, multi-step plan called a Task Graph.

- The user's request will be a natural language prompt.
- The output MUST be a JSON object containing a 'taskGraph'.
- The 'taskGraph' is a Directed Acyclic Graph (DAG) of 'nodes'.
- Each node represents a single, atomic action (a 'tool' to be executed).
- Nodes can depend on the output of other nodes. Use 'dependsOn' to specify dependencies.
- You can reference the output of a previous step using the handlebars-style syntax '{{step_id.output}}'.

Available Tools:
- 'file.write': Writes content to a file.
  - Input: { "path": string, "content": string }
- 'web.search': Searches the web for information.
  - Input: { "query": string }
- 'file.read': Reads the content of a file.
  - Input: { "path": string }
- 'file.list': Lists the files in a directory.
  - Input: { "path": string }

Example User Prompt: "Research the latest news about WebAssembly and save it to a file called wasm_news.md"

Example Output:
{
  "taskGraph": {
    "id": "tg_1",
    "nodes": [
      {
        "id": "step1",
        "tool": "web.search",
        "input": { "query": "latest news about WebAssembly" },
        "dependsOn": []
      },
      {
        "id": "step2",
        "tool": "file.write",
        "input": { "path": "/home/user/documents/wasm_news.md", "content": "{{step1.output}}" },
        "dependsOn": ["step1"]
      }
    ]
  }
}
Return only the raw JSON object.`),
		},
	}

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))

	if err != nil {
		return "", fmt.Errorf("error generating task graph: %w", err)
	}
	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content found in task graph response")
	}
	var resultText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			resultText += string(txt)
		}
	}
	
	// Clean the response from markdown formatting
    cleanedJSON := resultText
	if strings.HasPrefix(cleanedJSON, "```json") {
		cleanedJSON = strings.TrimPrefix(cleanedJSON, "```json")
		cleanedJSON = strings.TrimSuffix(cleanedJSON, "```")
	}
	cleanedJSON = strings.TrimSpace(cleanedJSON)
	
	// Validate JSON
	var temp interface{}
	if err := json.Unmarshal([]byte(cleanedJSON), &temp); err != nil {
		return "", fmt.Errorf("model returned invalid JSON for task graph: %w. Response: %s", err, cleanedJSON)
	}

	return cleanedJSON, nil
}


// GenerateImage generates an image from a text prompt.
func (m *AIModule) GenerateImage(prompt string) (string, error) {
	// In a real implementation, this would call a text-to-image model.
	// For now, we return a placeholder data URI.
	// This is a 1x1 transparent GIF.
	return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", nil
}


// Close releases resources used by the AI module.
func (m *AIModule) Close() {
	if m.client != nil {
		m.client.Close()
	}
}

    