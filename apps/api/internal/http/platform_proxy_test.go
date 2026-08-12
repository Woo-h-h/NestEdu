package http

import "testing"

func TestIsPlatformProxyPath(t *testing.T) {
	t.Parallel()

	cases := []struct {
		path string
		want bool
	}{
		{"/api/knowledge/document/list", true},
		{"/api/user/self", true},
		{"/api/file/upload", true},
		{"/api/ai/chat/completions", true},
		{"/api/ai/chat/send_message", true},
		{"/v1/text/generate", true},
		{"/v1", true},
		{"/api/v1/growth-records", false},
		{"/api/v1/knowledge/plans", false},
		{"/healthz", false},
		{"/", false},
	}

	for _, tc := range cases {
		if got := isPlatformProxyPath(tc.path); got != tc.want {
			t.Fatalf("isPlatformProxyPath(%q) = %v, want %v", tc.path, got, tc.want)
		}
	}
}
