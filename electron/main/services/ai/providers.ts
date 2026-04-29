import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export interface LlmProvider {
  generate(opts: { prompt: string; maxTokens: number }): Promise<string>
}

export class AnthropicProvider implements LlmProvider {
  private client: Anthropic

  constructor(apiKey: string, private model: string) {
    this.client = new Anthropic({ apiKey })
  }

  async generate(opts: { prompt: string; maxTokens: number }): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: opts.maxTokens,
      messages: [{ role: 'user', content: opts.prompt }],
    })
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected non-text response from Anthropic')
    }
    return content.text.trim()
  }
}

export class OpenAiProvider implements LlmProvider {
  private client: OpenAI

  constructor(apiKey: string, private model: string) {
    this.client = new OpenAI({ apiKey })
  }

  async generate(opts: { prompt: string; maxTokens: number }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: opts.maxTokens,
      messages: [{ role: 'user', content: opts.prompt }],
    })
    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }
    return content.trim()
  }
}

export class OpenRouterProvider implements LlmProvider {
  private client: OpenAI

  constructor(apiKey: string, private model: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/rhysjohns/differ',
        'X-Title': 'Differ',
      },
    })
  }

  async generate(opts: { prompt: string; maxTokens: number }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: opts.maxTokens,
      messages: [{ role: 'user', content: opts.prompt }],
    })
    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenRouter')
    }
    return content.trim()
  }
}
