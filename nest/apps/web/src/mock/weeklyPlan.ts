import type { WeeklyPlan, DayPlan, ClassType, ChatMessage } from '@/types/weeklyPlan'

function randomDelay(): number {
  return 1200 + Math.random() * 1300
}

export function mockGenerateWeeklyPlan(
  themeName: string,
  className: ClassType,
  weekNumber: number,
  _fileNames: string[]
): Promise<WeeklyPlan> {
  return new Promise((resolve) => {
    const dailyPlans: DayPlan[] = [
      {
        day: '周一',
        collectiveLearning: `《好宝宝爱图书》\n（语言、社会）`,
        regionalGames: `角色游戏：甜甜书屋（指导幼儿翻书技巧）\n表演区：故事表演（投放动物头饰）`,
        dailyLife: `自由环节：我会排队喝水\n\n过渡环节：\n1. 我爱洗手\n2. 安静吃饭不挑食\n3. 做健康好宝宝\n\n离园环节：\n安全教育：不跟陌生人走`,
        outdoorSports: `（1）集体游戏: 小兔采蘑菇、开火车\n（2）自选器材：尾巴、沙包、圈圈、纸球、积木`,
      },
      {
        day: '周二',
        collectiveLearning: `《小兔和狼》\n（艺术、游戏）`,
        regionalGames: `角色游戏：甜甜书屋（指导幼儿翻书技巧）\n表演区：故事表演（投放动物头饰）`,
        dailyLife: `自由环节：我会排队喝水\n\n过渡环节：\n1. 我爱洗手\n2. 安静吃饭不挑食\n3. 做健康好宝宝\n\n离园环节：\n安全教育：不跟陌生人走`,
        outdoorSports: `（1）集体游戏: 小兔采蘑菇、开火车\n（2）自选器材：尾巴、沙包、圈圈、纸球、积木`,
      },
      {
        day: '周三',
        collectiveLearning: `《植物园之旅》\n（社会、语言）`,
        regionalGames: `角色游戏：甜甜书屋（指导幼儿翻书技巧）\n表演区：故事表演（投放动物头饰）`,
        dailyLife: `自由环节：我会排队喝水\n\n过渡环节：\n1. 我爱洗手\n2. 安静吃饭不挑食\n3. 做健康好宝宝\n\n离园环节：\n安全教育：不跟陌生人走`,
        outdoorSports: `（1）集体游戏: 小兔采蘑菇、开火车\n（2）自选器材：尾巴、沙包、圈圈、纸球、积木`,
      },
      {
        day: '周四',
        collectiveLearning: `《小老鼠的旅行》\n（语言）`,
        regionalGames: `角色游戏：甜甜书屋（指导幼儿翻书技巧）\n表演区：故事表演（投放动物头饰）`,
        dailyLife: `自由环节：我会排队喝水\n\n过渡环节：\n1. 我爱洗手\n2. 安静吃饭不挑食\n3. 做健康好宝宝\n\n离园环节：\n安全教育：不跟陌生人走`,
        outdoorSports: `（1）集体游戏: 小兔采蘑菇、开火车\n（2）自选器材：尾巴、沙包、圈圈、纸球、积木`,
      },
      {
        day: '周五',
        collectiveLearning: `《奇妙的蔬菜》\n（科学）`,
        regionalGames: `角色游戏：甜甜书屋（指导幼儿翻书技巧）\n表演区：故事表演（投放动物头饰）`,
        dailyLife: `自由环节：我会排队喝水\n\n过渡环节：\n1. 我爱洗手\n2. 安静吃饭不挑食\n3. 做健康好宝宝\n\n离园环节：\n安全教育：不跟陌生人走`,
        outdoorSports: `（1）集体游戏: 小兔采蘑菇、开火车\n（2）自选器材：尾巴、沙包、圈圈、纸球、积木`,
      },
    ]

    const plan: WeeklyPlan = {
      id: `plan_${Date.now()}`,
      themeName,
      className,
      weekNumber,
      weeklyFocus:
        '1. 感受季节的变化，发现变化的地方，探索相关的动物。\n2. 午睡时能够将自己的衣物整理好放在指定位置。\n3. 能够遵守游戏规则，与同伴友好进行活动游戏。',
      dailyPlans,
      suggestions:
        '1. 请家长配合做好季节性疾病的预防工作，加强幼儿个人卫生及班级消毒工作。\n2. 活动延伸：区域投放本主题相关材料，鼓励幼儿在区域活动中自主探索和选择。',
      createdAt: new Date().toISOString(),
      status: 'draft',
    }

    setTimeout(() => resolve(plan), randomDelay())
  })
}

export function mockAiModify(
  instruction: string,
  currentPlan: WeeklyPlan,
  _chatHistory: ChatMessage[]
): Promise<{ message: string; updatedPlan: WeeklyPlan }> {
  return new Promise((resolve) => {
    let response = ''
    if (instruction.includes('户外') || instruction.includes('运动')) {
      response = '好的，已根据您的建议调整了户外运动内容，增加了更多适合幼儿的集体游戏选项。'
    } else if (instruction.includes('安全') || instruction.includes('教育')) {
      response = '已更新安全教育的相关描述，强调不跟陌生人走、排队秩序等日常安全习惯。'
    } else {
      response = '已理解您的修改意见，已对周计划中相应内容进行了调整。如需进一步优化请继续说明。'
    }

    setTimeout(() => {
      resolve({
        message: response,
        updatedPlan: currentPlan,
      })
    }, 800 + Math.random() * 600)
  })
}
