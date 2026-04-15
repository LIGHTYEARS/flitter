async function ZC0(T, R, a) {
  let e = (await (await ep({
    configService: R
  }, a)).messages.create({
    model: mb,
    max_tokens: 300,
    system: "You are a classifier that answers yes/no questions. You must use the provided tool to give your answer with reasoning.",
    messages: [{
      role: "user",
      content: T
    }],
    tools: [{
      name: "answer_question",
      description: "Provide your answer to the yes/no question with reasoning",
      input_schema: {
        type: "object",
        properties: {
          probability_yes: {
            type: "number",
            description: 'Probability that the answer is "yes", from 0 to 1. Use 0 for definitely no, 0.5 for uncertain, 1 for definitely yes.'
          },
          reasoning: {
            type: "string",
            description: "Brief (2-sentence max) explanation of why you gave this probability."
          }
        },
        required: ["probability_yes", "reasoning"]
      }
    }],
    tool_choice: {
      type: "tool",
      name: "answer_question"
    }
  }, {
    headers: {
      "anthropic-beta": "interleaved-thinking-2025-05-14"
    }
  })).content.find(c => c.type === "tool_use");
  if (!e || e.type !== "tool_use") throw Error("Expected tool use response from Claude");
  let t = e.input,
    r = t.probability_yes ?? 0.5,
    h = t.reasoning ?? "No reasoning provided",
    i;
  if (r >= 0.8) i = "yes";else if (r < 0.2) i = "no";else i = "uncertain";
  return {
    result: i,
    probability: r,
    reason: h
  };
}