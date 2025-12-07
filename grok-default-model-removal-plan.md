# Grok配置去除默认模型功能实现计划

## 需求分析
完全移除"使用默认模型"的复选框，让用户必须手动选择模型。

## 当前实现分析

### 1. GrokFormFields组件 (src/components/providers/forms/GrokFormFields.tsx)
- **问题**: 包含"使用默认模型"复选框 (第110-121行)
- **需要修改**: 
  - 移除`useDefaultModel`和`onUseDefaultModelChange`属性
  - 移除`defaultModelCandidate`属性
  - 删除复选框UI元素
  - 简化模型输入框，移除`disabled`状态和条件性placeholder

### 2. ProviderForm组件 (src/components/providers/forms/ProviderForm.tsx)
- **问题**: 包含处理`useDefaultModel`状态的逻辑 (第1007-1037行)
- **需要修改**:
  - 移除`useDefaultModel`相关的状态计算和处理逻辑
  - 简化`onModelChange`处理函数，移除默认模型相关逻辑
  - 更新`GrokFormFields`组件的props传递

### 3. grokProviderPresets配置 (src/config/grokProviderPresets.ts)
- **问题**: 预设中包含`defaultModel`字段 (第12行)
- **需要修改**:
  - 移除预设中的`defaultModel`字段
  - 确保模型列表中的第一个模型作为默认选择

### 4. 默认配置 (src/components/providers/forms/ProviderForm.tsx)
- **问题**: `GROK_DEFAULT_CONFIG`包含`defaultModel`字段 (第77行)
- **需要修改**:
  - 移除`defaultModel`字段
  - 保持其他配置不变

## 实现步骤

### 步骤1: 修改GrokFormFields组件
```typescript
// 移除的属性
- useDefaultModel: boolean;
- onUseDefaultModelChange: (checked: boolean) => void;
- defaultModelCandidate?: string;

// 移除的UI元素
- Checkbox组件和相关的label
- 条件性的disabled状态
- 条件性的placeholder文本
```

### 步骤2: 更新ProviderForm组件
```typescript
// 移除的逻辑
- useDefaultModel状态计算 (第1007-1016行)
- onUseDefaultModelChange处理函数 (第1017-1037行)
- 相关的props传递
```

### 步骤3: 修改grokProviderPresets配置
```typescript
// 移除的字段
- defaultModel: "grok-code-fast-1"
```

### 步骤4: 更新默认配置
```typescript
// GROK_DEFAULT_CONFIG中移除
- defaultModel: "grok-code-fast-1"
```

## 预期效果
1. 用户在添加或编辑Grok供应商时，必须手动输入模型名称
2. 不再有"使用默认模型"的选项
3. 模型输入框始终可用，不会被禁用
4. 预设配置不再包含默认模型，避免混淆

## 测试要点
1. 验证新增Grok供应商时必须手动输入模型
2. 验证编辑现有Grok供应商时模型字段正常工作
3. 验证预设供应商加载时模型字段的行为
4. 确保表单验证仍然正常工作