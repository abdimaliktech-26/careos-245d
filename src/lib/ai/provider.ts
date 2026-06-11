import { createAnthropic } from '@ai-sdk/anthropic'

/**
 * Single AI provider for all CareIntake AI routes.
 * Anthropic Claude (HIPAA-eligible with BAA + zero data retention).
 * Swapping providers (e.g. to AWS Bedrock) means changing only this file.
 */
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
})

/** Default model for CareIntake AI features. */
export const aiModel = anthropic('claude-haiku-4-5')
