# relative-keyword-relevance-split

An [ObjectiveAI](https://objective-ai.io) Function for ranking content items by keyword relevance using separate per-keyword comparisons.

> **ObjectiveAI** is a platform for scoring, ranking, and simulating preferences using ensembles of LLMs. Learn more at [objective-ai.io](https://objective-ai.io) or see the [GitHub repository](https://github.com/ObjectiveAI/objectiveai).

## Overview

This function ranks multiple content items by their relevance to a set of keywords. Each keyword is evaluated separately, asking "Which content is most relevant with regards to [keyword]?". The rankings from each keyword are then averaged to produce a final ranking.

## Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `keywords` | `string[]` | Yes | Keywords to evaluate relevance against (minimum 1) |
| `contentItems` | `array` | Yes | Content items to rank (minimum 2) |

### Supported Content Types

Each item in `contentItems` can be:

- **Text** - Plain text strings
- **Image** - Image content
- **Video** - Video content
- **Audio** - Audio content
- **File** - File content
- **Array** - Multiple content pieces combined

## Output

A vector of scores, one per content item, that sum to 1. Higher scores indicate greater relevance across all keywords.

## Example

```json
{
  "input": {
    "keywords": ["artificial intelligence", "healthcare"],
    "contentItems": [
      "AI diagnostics are improving patient outcomes.",
      "Stock market trends for tech companies.",
      "Machine learning in medical imaging."
    ]
  }
}
```

Output: `[0.40, 0.05, 0.55]`

## How It Works

1. For each keyword, constructs a prompt: "Which content is most relevant with regards to [keyword]?"
2. Presents all content items as response options
3. Each Ensemble LLM votes for the most relevant item
4. Rankings from each keyword are averaged for the final result

For the example above:
- Keyword "artificial intelligence": Items ranked `[0.35, 0.10, 0.55]`
- Keyword "healthcare": Items ranked `[0.45, 0.00, 0.55]`
- Final average: `[0.40, 0.05, 0.55]`

## Comparison with Joined Strategy

| Aspect | Split (this function) | Joined |
|--------|----------------------|--------|
| Prompts | 1 prompt per keyword | 1 prompt with all keywords |
| Keyword handling | Evaluates keywords independently | Considers keyword relationships |
| Best for | Keyword coverage | Thematic relevance |

## Default Profile

The default profile uses an ensemble of models from OpenAI, Google, xAI, and DeepSeek with equal weights across all models.

## Related Functions

- [WiggidyW/relative-keyword-relevance](https://github.com/WiggidyW/relative-keyword-relevance) - Combines multiple ranking strategies
- [WiggidyW/relative-keyword-relevance-joined](https://github.com/WiggidyW/relative-keyword-relevance-joined) - Single-prompt ranking
- [WiggidyW/keyword-relevance-split](https://github.com/WiggidyW/keyword-relevance-split) - Scores a single content item
