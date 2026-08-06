package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// PlatformClientConfig AI101 平台 HTTP 客户端配置。
type PlatformClientConfig struct {
	BaseURL string
	Referer string
	MVP     string
}

// PlatformClient 调用 AI101（api.zcat.cn）的薄封装：转发鉴权头、超时、解析 JSON。
// KnowledgeService / LLMService 通过它对接知识库与智能体，而不是各自写 HTTP。
type PlatformClient struct {
	cfg    PlatformClientConfig
	client *http.Client
}

func NewPlatformClient(cfg PlatformClientConfig) *PlatformClient {
	baseURL := strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/")
	if baseURL == "" {
		baseURL = "https://api.zcat.cn"
	}
	return &PlatformClient{
		cfg: PlatformClientConfig{
			BaseURL: baseURL,
			Referer: strings.TrimSpace(cfg.Referer),
			MVP:     strings.TrimSpace(cfg.MVP),
		},
		client: &http.Client{Timeout: 120 * time.Second},
	}
}

// ForwardHeaders 从前端请求透传给平台的鉴权与客户端头（Authorization、X-Uid* 等）。
type ForwardHeaders map[string]string

func (c *PlatformClient) GetJSON(
	ctx context.Context,
	path string,
	query url.Values,
	headers ForwardHeaders,
	target any,
) error {
	reqURL := c.cfg.BaseURL + ensurePath(path)
	if len(query) > 0 {
		reqURL += "?" + query.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return err
	}
	c.applyHeaders(req, headers)
	return c.doJSON(req, target)
}

func (c *PlatformClient) PostJSON(
	ctx context.Context,
	path string,
	body any,
	headers ForwardHeaders,
	target any,
) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.cfg.BaseURL+ensurePath(path), bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	c.applyHeaders(req, headers)
	return c.doJSON(req, target)
}

func (c *PlatformClient) DeleteJSON(
	ctx context.Context,
	path string,
	body any,
	headers ForwardHeaders,
	target any,
) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, c.cfg.BaseURL+ensurePath(path), bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	c.applyHeaders(req, headers)
	return c.doJSON(req, target)
}

func (c *PlatformClient) applyHeaders(req *http.Request, headers ForwardHeaders) {
	for key, value := range headers {
		if strings.TrimSpace(value) != "" {
			req.Header.Set(key, value)
		}
	}
	if c.cfg.Referer != "" {
		req.Header.Set("Referer", c.cfg.Referer)
	}
	if c.cfg.MVP != "" && req.Header.Get("X-Mvp") == "" {
		req.Header.Set("X-Mvp", c.cfg.MVP)
	}
}

func (c *PlatformClient) doJSON(req *http.Request, target any) error {
	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("platform api %s %s: %s", req.Method, req.URL.Path, truncate(string(body), 200))
	}
	if target == nil {
		return nil
	}
	return json.Unmarshal(body, target)
}

func ensurePath(path string) string {
	if strings.HasPrefix(path, "/") {
		return path
	}
	return "/" + path
}

func truncate(text string, max int) string {
	if len(text) <= max {
		return text
	}
	return text[:max]
}
