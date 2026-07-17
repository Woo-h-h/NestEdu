package service

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/your-org/mvp-template/apps/api/internal/model"
)

const kindergartenContext = `你是"附属幼儿园"的资深教研组长，拥有20年幼儿教育经验。

【办园理念】自然和谐、共同成长
【课程体系】《幼儿自主学习课程》
【五大领域】健康、语言、社会、科学、艺术`

const weeklyPlanStructure = `周计划表是一个8行×5列的表格，包含周工作重点、周一至周五每日计划、实施建议。`

const outputFormat = `你必须严格按以下JSON格式输出：
{
  "weeklyFocus": "周工作重点",
  "dailyPlans": [
    {"day":"周一","collectiveLearning":"","regionalGames":"","dailyLife":"","outdoorSports":""}
  ],
  "suggestions": "实施建议"
}`

type weeklyPlanLLMResult struct {
	WeeklyFocus string           `json:"weeklyFocus"`
	DailyPlans  []model.DayPlan  `json:"dailyPlans"`
	Suggestions string           `json:"suggestions"`
}

func buildGenerateSystemPrompt(knowledgeContext string) string {
	prompt := kindergartenContext + "\n\n" + weeklyPlanStructure + "\n\n你的任务是根据教师提供的信息生成周计划表。"
	if knowledgeContext != "" {
		prompt += "\n\n【知识库参考内容】\n" + knowledgeContext
	}
	prompt += "\n\n" + outputFormat
	return prompt
}

func buildModifySystemPrompt(plan model.WeeklyPlanPayload) string {
	raw, _ := encodeWeeklyPlanForPrompt(plan)
	return kindergartenContext + "\n\n你是教学助手。\n\n【当前周计划】\n" + raw + "\n\n输出 JSON：{\"message\":\"...\",\"updatedPlan\":{...}}"
}

func buildGenerateUserMessage(input GenerateWeeklyPlanInput) string {
	parts := []string{
		"请根据以下信息生成周计划表：",
		fmt.Sprintf("- 主题名称：%s", input.ThemeName),
		fmt.Sprintf("- 班级：%s", input.ClassName),
		fmt.Sprintf("- 第 %d 周", input.WeekNumber),
	}
	if strings.TrimSpace(input.Notes) != "" {
		parts = append(parts, "- 补充说明："+input.Notes)
	}
	if len(input.SelectedPlans) > 0 {
		parts = append(parts, "\n--- 教师选择的教案 ---")
		for i, plan := range input.SelectedPlans {
			content := plan.Content
			if len(content) > 2000 {
				content = content[:2000]
			}
			parts = append(parts, fmt.Sprintf("\n【教案%d】%s（%s）\n%s", i+1, plan.Title, plan.Domain, content))
		}
	}
	if len(input.FileContents) > 0 {
		parts = append(parts, "\n--- 教师上传的日计划文件内容 ---")
		for _, file := range input.FileContents {
			content := file.Content
			if len(content) > 3000 {
				content = content[:3000] + "\n...(内容过长已截断)"
			}
			parts = append(parts, fmt.Sprintf("\n【%s】\n%s", file.Name, content))
		}
	}
	parts = append(parts, "\n请生成完整的周计划JSON。")
	return strings.Join(parts, "\n")
}

func buildModifyUserMessage(instruction string) string {
	return "教师指令：" + instruction + "\n\n请根据指令修改周计划，输出完整的修改后JSON。"
}

func encodeWeeklyPlanForPrompt(plan model.WeeklyPlanPayload) (string, error) {
	// simple string builder for prompt
	return fmt.Sprintf("%+v", plan), nil
}

func extractJSON(text string) string {
	if json.Valid([]byte(text)) {
		return text
	}
	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")
	if start >= 0 && end > start {
		return text[start : end+1]
	}
	return text
}

func isValidWeeklyPlanLLMResult(result weeklyPlanLLMResult) bool {
	if strings.TrimSpace(result.WeeklyFocus) == "" || strings.TrimSpace(result.Suggestions) == "" {
		return false
	}
	if len(result.DailyPlans) != 5 {
		return false
	}
	validDays := map[string]bool{"周一": true, "周二": true, "周三": true, "周四": true, "周五": true}
	for _, dp := range result.DailyPlans {
		if !validDays[dp.Day] {
			return false
		}
	}
	return true
}

func parseWeeklyPlanLLMResult(content string) (weeklyPlanLLMResult, error) {
	jsonText := extractJSON(content)
	var result weeklyPlanLLMResult
	if err := json.Unmarshal([]byte(jsonText), &result); err != nil {
		return weeklyPlanLLMResult{}, err
	}
	if !isValidWeeklyPlanLLMResult(result) {
		return weeklyPlanLLMResult{}, fmt.Errorf("invalid weekly plan shape")
	}
	return result, nil
}

func wrapGeneratedPlan(input GenerateWeeklyPlanInput, result weeklyPlanLLMResult) model.WeeklyPlanPayload {
	return model.WeeklyPlanPayload{
		ID:          fmt.Sprintf("plan_%d", time.Now().UnixMilli()),
		ThemeName:   input.ThemeName,
		ClassName:   input.ClassName,
		WeekNumber:  input.WeekNumber,
		WeeklyFocus: result.WeeklyFocus,
		DailyPlans:  result.DailyPlans,
		Suggestions: result.Suggestions,
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
		Status:      "draft",
	}
}

func mockGenerateWeeklyPlan(themeName, className string, weekNumber int) model.WeeklyPlanPayload {
	return model.WeeklyPlanPayload{
		ID:          fmt.Sprintf("plan_%d", time.Now().UnixMilli()),
		ThemeName:   themeName,
		ClassName:   className,
		WeekNumber:  weekNumber,
		WeeklyFocus: "1. 感受季节的变化，发现变化的地方。\n2. 午睡时能够整理衣物。\n3. 遵守游戏规则，友好活动。",
		DailyPlans: []model.DayPlan{
			{Day: "周一", CollectiveLearning: "《好宝宝爱图书》（语言、社会）", RegionalGames: "角色游戏：甜甜书屋", DailyLife: "自由环节：排队喝水", OutdoorSports: "集体游戏: 小兔采蘑菇"},
			{Day: "周二", CollectiveLearning: "《小兔和狼》（艺术）", RegionalGames: "表演区：故事表演", DailyLife: "过渡环节：洗手进餐", OutdoorSports: "集体游戏: 开火车"},
			{Day: "周三", CollectiveLearning: "《植物园之旅》（社会）", RegionalGames: "建构区", DailyLife: "离园安全教育", OutdoorSports: "自选器材：沙包圈圈"},
			{Day: "周四", CollectiveLearning: "《小老鼠的旅行》（语言）", RegionalGames: "阅读区", DailyLife: "安静吃饭不挑食", OutdoorSports: "集体游戏: 接力跑"},
			{Day: "周五", CollectiveLearning: "《奇妙的蔬菜》（科学）", RegionalGames: "科学区", DailyLife: "整理物品", OutdoorSports: "室内运动游戏"},
		},
		Suggestions: "1. 请家长配合季节性疾病预防。\n2. 区域投放主题相关材料。",
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
		Status:      "draft",
	}
}

func buildTeachingPlanSystemPrompt() string {
	return kindergartenContext + `

你的任务是：根据教师给出的周主题，生成若干份可独立使用的幼儿园教案。

每份教案需包含：
- title：教案标题
- domain：所属领域（健康/语言/社会/科学/艺术，可组合如「语言、社会」）
- gradeLevel：适用年龄段（小班/中班/大班/通用）
- objectives：活动目标（多条用\\n分隔）
- content：教案正文（含活动准备、过程、延伸等，具体可操作）

你必须严格按以下JSON格式输出：
{
  "plans": [
    {
      "title": "...",
      "domain": "...",
      "gradeLevel": "...",
      "objectives": "...",
      "content": "..."
    }
  ]
}`
}

func buildTeachingPlanUserMessage(themeName, className string, count int) string {
	parts := []string{
		fmt.Sprintf("请围绕主题「%s」生成 %d 份幼儿园教案。", themeName, count),
	}
	if strings.TrimSpace(className) != "" {
		parts = append(parts, fmt.Sprintf("适用班级：%s", className))
	}
	parts = append(parts, "教案之间应覆盖不同领域或不同活动类型，避免重复。请输出完整 JSON。")
	return strings.Join(parts, "\n")
}

type teachingPlansLLMResult struct {
	Plans []model.TeachingPlan `json:"plans"`
}

func isValidTeachingPlanShape(plan model.TeachingPlan) bool {
	return strings.TrimSpace(plan.Title) != "" &&
		strings.TrimSpace(plan.Domain) != "" &&
		strings.TrimSpace(plan.GradeLevel) != "" &&
		strings.TrimSpace(plan.Objectives) != "" &&
		strings.TrimSpace(plan.Content) != ""
}

func parseTeachingPlansLLMResult(content, themeName string, count int) ([]model.TeachingPlan, error) {
	jsonText := extractJSON(content)
	var result teachingPlansLLMResult
	if err := json.Unmarshal([]byte(jsonText), &result); err != nil {
		return nil, err
	}
	if len(result.Plans) == 0 {
		return nil, fmt.Errorf("empty teaching plans")
	}

	now := time.Now().UnixMilli()
	out := make([]model.TeachingPlan, 0, len(result.Plans))
	for i, plan := range result.Plans {
		if !isValidTeachingPlanShape(plan) {
			continue
		}
		plan.ID = fmt.Sprintf("ai_%d_%d", now, i)
		plan.Source = "ai"
		out = append(out, plan)
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("invalid teaching plan shape")
	}
	if len(out) > count {
		out = out[:count]
	}
	_ = themeName
	return out, nil
}

func mockGenerateTeachingPlans(themeName, className string, count int) []model.TeachingPlan {
	if count <= 0 {
		count = 5
	}
	grade := strings.TrimSpace(className)
	if grade == "" {
		grade = "通用"
	}
	templates := []struct {
		title      string
		domain     string
		objectives string
		content    string
	}{
		{
			title:      themeName + "·探索发现",
			domain:     "科学",
			objectives: "1. 观察与主题相关的现象。\n2. 愿意用语言描述发现。\n3. 初步形成探究兴趣。",
			content:    "【活动准备】主题相关实物/图片。\n【活动过程】导入→观察探索→分享交流→小结。\n【活动延伸】区域投放相关材料。",
		},
		{
			title:      themeName + "·故事时光",
			domain:     "语言",
			objectives: "1. 认真倾听故事。\n2. 理解故事主要情节。\n3. 愿意表达自己的感受。",
			content:    "【活动准备】绘本/故事图片。\n【活动过程】讲述→提问→讨论→表演片段。\n【活动延伸】阅读区投放绘本。",
		},
		{
			title:      themeName + "·美术创作",
			domain:     "艺术",
			objectives: "1. 感受主题之美。\n2. 大胆用材料表现。\n3. 欣赏同伴作品。",
			content:    "【活动准备】彩纸、颜料、粘贴材料。\n【活动过程】欣赏→创作→展示分享。\n【活动延伸】美工区持续创作。",
		},
		{
			title:      themeName + "·运动游戏",
			domain:     "健康",
			objectives: "1. 积极参与户外活动。\n2. 遵守简单游戏规则。\n3. 体验合作与运动乐趣。",
			content:    "【活动准备】运动器材、场地划分。\n【活动过程】热身→集体游戏→自选器材→放松。\n【活动延伸】家庭亲子运动。",
		},
		{
			title:      themeName + "·社会交往",
			domain:     "社会",
			objectives: "1. 愿意与同伴协商。\n2. 学习关心他人。\n3. 体验集体活动乐趣。",
			content:    "【活动准备】角色材料、情境布置。\n【活动过程】情境导入→角色体验→冲突协商→小结。\n【活动延伸】角色区持续游戏。",
		},
	}
	if count > len(templates) {
		count = len(templates)
	}
	now := time.Now().UnixMilli()
	plans := make([]model.TeachingPlan, 0, count)
	for i := 0; i < count; i++ {
		t := templates[i]
		plans = append(plans, model.TeachingPlan{
			ID:         fmt.Sprintf("ai_%d_%d", now, i),
			Title:      t.title,
			Domain:     t.domain,
			GradeLevel: grade,
			Objectives: t.objectives,
			Content:    t.content,
			Source:     "ai",
		})
	}
	return plans
}

func mockModifyWeeklyPlan(instruction string, plan model.WeeklyPlanPayload) ModifyWeeklyPlanResult {
	message := "已理解您的修改意见，已对周计划中相应内容进行了调整。"
	if strings.Contains(instruction, "户外") || strings.Contains(instruction, "运动") {
		message = "好的，已根据您的建议调整了户外运动内容。"
	} else if strings.Contains(instruction, "安全") {
		message = "已更新安全教育相关描述。"
	}
	plan.Status = "draft"
	plan.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	return ModifyWeeklyPlanResult{Message: message, UpdatedPlan: plan}
}
