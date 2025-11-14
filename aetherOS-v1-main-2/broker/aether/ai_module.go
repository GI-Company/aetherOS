package aether

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

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
	// The client automatically uses the GEMINI_API_KEY environment variable.
	client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
	if err != nil {
		return nil, fmt.Errorf("failed to create genai client: %w", err)
	}
	return &AIModule{client: client}, nil
}

// GenerateText generates text from a given prompt.
func (m *AIModule) GenerateText(prompt string) (string, error) {
	ctx := context.Background()
	model := m.client.GenerativeModel("gemini-1.5-flash")
	resp, err := model.GenerateContent(ctx, genai.Text(prompt))

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
			genai.Text(`You are a UI element code generator. Generate a React component using TypeScript, Next.js, and Tailwind CSS for the UI element described in the prompt.
  - Use functional components and hooks.
  - Use shadcn/ui components where appropriate (e.g., Button, Card, Input).
  - Do not include any imports that are not used in the component.
  Return only the raw TypeScript code for the component. Do not include any explanatory text or markdown formatting like '` + "```" + `tsx'.`),
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

// Close releases resources used by the AI module.
func (m *AIModule) Close() {
	if m.client != nil {
		m.client.Close()
	}
}
