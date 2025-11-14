package aether

import (
	"context"
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

	// Concatenate text parts from the response.
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

// Close releases resources used by the AI module.
func (m *AIModule) Close() {
	if m.client != nil {
		m.client.Close()
	}
}
