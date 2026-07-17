package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/your-org/mvp-template/apps/api/internal/model"
)

type LLMConfig struct {
	APIKey  string
	BaseURL string
	Model   string
}

type LLMService struct {
	cfg LLMConfig
}

type GenerateWeeklyPlanInput struct {
	FileContents  []FileContentInput `json:"fileContents"`
	ThemeName     string             `json:"themeName"`
	ClassName     string             `json:"className"`
	WeekNumber    int                `json:"weekNumber"`
	Notes         string             `json:"notes"`
	SelectedPlans []TeachingPlanInput `json:"selectedPlans"`
}

type FileContentInput struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

type TeachingPlanInput struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Domain     string `json:"domain"`
	GradeLevel string `json:"gradeLevel"`
	Objectives string `json:"objectives"`
	Content    string `json:"content"`
}

type ModifyWeeklyPlanInput struct {
	CurrentPlan model.WeeklyPlanPayload `json:"currentPlan"`
	Instruction string                  `json:"instruction"`
	ChatHistory []ChatMessageInput      `json:"chatHistory"`
}

type ChatMessageInput struct {
	Role      string `json:"role"`
	Content   string `json:"content"`
	Timestamp string `json:"timestamp"`
}

type ModifyWeeklyPlanResult struct {
	Message     string                  `json:"message"`
	UpdatedPlan model.WeeklyPlanPayload `json:"updatedPlan"`
}

type GenerateTeachingPlansInput struct {
	ThemeName string `json:"themeName"`
	ClassName string `json:"className"`
	Count     int    `json:"count"`
}

func NewLLMService(cfg LLMConfig) *LLMService {
	return &LLMService{cfg: cfg}
}

func (s *LLMService) IsConfigured() bool {
	key := strings.TrimSpace(s.cfg.APIKey)
	return key != "" && key != "sk-your-key-here"
}

func (s *LLMService) GenerateWeeklyPlan(ctx context.Context, input GenerateWeeklyPlanInput) (model.WeeklyPlanPayload, error) {
	if !s.IsConfigured() {
		return mockGenerateWeeklyPlan(input.ThemeName, input.ClassName, input.WeekNumber), nil
	}

	systemPrompt := buildGenerateSystemPrompt("")
	userMessage := buildGenerateUserMessage(input)

	content, err := s.chatCompletion(ctx, []chatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userMessage},
	}, 0.7)
	if err != nil {
		return model.WeeklyPlanPayload{}, err
	}

	result, err := parseWeeklyPlanLLMResult(content)
	if err == nil {
		return wrapGeneratedPlan(input, result), nil
	}

	retryContent, retryErr := s.chatCompletion(ctx, []chatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userMessage},
		{Role: "user", Content: "你上一次的返回格式不正确。请严格只输出 JSON，确保 dailyPlans 是有5个元素（周一到周五）的数组。"},
	}, 0.3)
	if retryErr != nil {
		return model.WeeklyPlanPayload{}, retryErr
	}

	retryResult, retryParseErr := parseWeeklyPlanLLMResult(retryContent)
	if retryParseErr != nil {
		return model.WeeklyPlanPayload{}, errors.New("LLM 返回格式两次均不合法，请重试")
	}

	return wrapGeneratedPlan(input, retryResult), nil
}

func (s *LLMService) GenerateTeachingPlans(ctx context.Context, input GenerateTeachingPlansInput) ([]model.TeachingPlan, error) {
	themeName := strings.TrimSpace(input.ThemeName)
	if themeName == "" {
		return nil, errors.New("themeName is required")
	}
	count := input.Count
	if count <= 0 {
		count = 5
	}
	if count > 8 {
		count = 8
	}

	if !s.IsConfigured() {
		return mockGenerateTeachingPlans(themeName, input.ClassName, count), nil
	}

	systemPrompt := buildTeachingPlanSystemPrompt()
	userMessage := buildTeachingPlanUserMessage(themeName, input.ClassName, count)

	content, err := s.chatCompletion(ctx, []chatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userMessage},
	}, 0.7)
	if err != nil {
		return nil, err
	}

	plans, parseErr := parseTeachingPlansLLMResult(content, themeName, count)
	if parseErr == nil {
		return plans, nil
	}

	retryContent, retryErr := s.chatCompletion(ctx, []chatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userMessage + "\n\n上次输出格式不符合要求，请严格按 JSON 的 plans 数组重新输出。"},
	}, 0.5)
	if retryErr != nil {
		return nil, retryErr
	}
	retryPlans, retryParseErr := parseTeachingPlansLLMResult(retryContent, themeName, count)
	if retryParseErr != nil {
		return nil, retryParseErr
	}
	return retryPlans, nil
}

func (s *LLMService) ModifyWeeklyPlan(ctx context.Context, input ModifyWeeklyPlanInput) (ModifyWeeklyPlanResult, error) {
	if !s.IsConfigured() {
		return mockModifyWeeklyPlan(input.Instruction, input.CurrentPlan), nil
	}

	systemPrompt := buildModifySystemPrompt(input.CurrentPlan)
	userMessage := buildModifyUserMessage(input.Instruction)

	content, err := s.chatCompletion(ctx, []chatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userMessage},
	}, 0.7)
	if err != nil {
		return ModifyWeeklyPlanResult{}, err
	}

	jsonText := extractJSON(content)
	var parsed struct {
		Message     string                  `json:"message"`
		UpdatedPlan weeklyPlanLLMResult     `json:"updatedPlan"`
	}
	if err := json.Unmarshal([]byte(jsonText), &parsed); err != nil {
		return ModifyWeeklyPlanResult{}, fmt.Errorf("decode modify result: %w", err)
	}
	if parsed.Message == "" || !isValidWeeklyPlanLLMResult(parsed.UpdatedPlan) {
		return ModifyWeeklyPlanResult{}, errors.New("LLM 修改返回格式不合法")
	}

	updated := input.CurrentPlan
	updated.WeeklyFocus = parsed.UpdatedPlan.WeeklyFocus
	updated.DailyPlans = parsed.UpdatedPlan.DailyPlans
	updated.Suggestions = parsed.UpdatedPlan.Suggestions
	updated.Status = "draft"
	updated.CreatedAt = time.Now().UTC().Format(time.RFC3339)

	return ModifyWeeklyPlanResult{
		Message:     parsed.Message,
		UpdatedPlan: updated,
	}, nil
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatCompletionResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func (s *LLMService) chatCompletion(ctx context.Context, messages []chatMessage, temperature float64) (string, error) {
	baseURL := strings.TrimRight(s.cfg.BaseURL, "/")
	if baseURL == "" {
		baseURL = "https://api.deepseek.com"
	}
	modelName := s.cfg.Model
	if modelName == "" {
		modelName = "deepseek-chat"
	}

	body, err := json.Marshal(map[string]any{
		"model":       modelName,
		"messages":    messages,
		"temperature": temperature,
		"max_tokens":  4096,
		"response_format": map[string]string{
			"type": "json_object",
		},
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.cfg.APIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("API 请求失败 (%d): %s", resp.StatusCode, string(respBody[:min(len(respBody), 200)]))
	}

	var parsed chatCompletionResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", err
	}
	if len(parsed.Choices) == 0 || parsed.Choices[0].Message.Content == "" {
		return "", errors.New("API 返回内容为空")
	}
	return parsed.Choices[0].Message.Content, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
