import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ParsedExamData, ProgressCallback } from "../types";

// Define the schema for the PDF parser output
const vocabSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING },
    meaning: { type: Type.STRING },
  },
};

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "The question number, e.g., 'q18', 'q19'" },
    tag: { type: Type.STRING, description: "The type of question, e.g., 'Purpose', 'Mood', 'Topic', 'Grammar', 'Ordering', 'Insertion'" },
    text: { type: Type.STRING, description: "The FULL, SOLVED, and RECONSTRUCTED English passage. See critical instructions." },
    trans: { type: Type.STRING, description: "A fluent Korean translation of the reconstructed text." },
    vocab: { type: Type.ARRAY, items: vocabSchema, description: "Exactly 5 challenging words. Format: Word in 'word', Korean definition in 'meaning'." },
    summary: { type: Type.STRING, description: "A detailed, specific summary (3-4 sentences) in Korean explaining the passage's specific content, logic, and conclusion." },
  },
  required: ["id", "tag", "text", "trans", "vocab", "summary"],
};

const examDataSchema: Schema = {
  type: Type.ARRAY,
  items: questionSchema,
};

/**
 * Parses the uploaded PDF using Gemini 3 Pro with streaming for progress updates
 */
export const parseExamPDF = async (
  base64Pdf: string,
  apiKey: string,
  useThinking: boolean,
  onProgress?: ProgressCallback
): Promise<ParsedExamData> => {
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  const modelName = "gemini-3-pro-preview";

  const prompt = `
    You are an expert English exam analyzer for Korean high school students.
    Analyze the attached PDF file which is an English Mock Exam.
    
    Your goal is to extract the reading passages (Q18-Q45) and convert them into "Clean Read" study versions.

    ***CRITICAL: YOU MUST SOLVE THE QUESTIONS TO GENERATE THE TEXT***
    Do not output the raw question text. You must output the "Correct Answer Version".

    SPECIFIC RULES FOR 'text' FIELD GENERATION:
    1. **Sentence Insertion (문장 삽입)**: 
       - Locate the "Target Sentence" in the box.
       - Find the CORRECT position (e.g., ①, ②, ③...) in the passage.
       - INSERT the target sentence at that exact position.
       - REMOVE all number markers (①, [1], etc.) to create a smooth paragraph.
       
    2. **Ordering (글의 순서)**: 
       - Read paragraphs (A), (B), (C).
       - DETERMINE the correct logical order (e.g., B -> C -> A).
       - COMBINE them into a single coherent text in that order.
       - REMOVE the labels (A), (B), (C).

    3. **Cloze / Blanks (빈칸 추론)**: 
       - The text in the PDF has a blank or a box.
       - YOU MUST FILL IT with the correct answer.
       - Do NOT leave it as "_______" or "Empty Box". Write the actual words.

    4. **Grammar / Vocabulary (어법/어휘)**: 
       - If the text shows options like "[is / are]", CHOOSE THE CORRECT ONE.
       - Output ONLY the correct word (e.g., "is"). Do not output "[is / are]".

    5. **Irrelevant Sentence (무관한 문장)**: 
       - IDENTIFY the sentence that does not fit the flow.
       - DELETE it completely from the text.

    6. **General**:
       - The final 'text' must be a perfect, fluent English passage as if it were a story or article. 
       - No question artifacts. No question numbers inside the text.

    DATA STRUCTURE:
    1. **id**: "q" + number (e.g., q18, q30).
    2. **tag**: Question type in Korean (e.g., 순서 배열, 문장 삽입, 어법, 빈칸 추론).
    3. **text**: The SOLVED, CLEAN English passage based on the rules above.
    4. **trans**: A natural, fluent Korean translation of the SOLVED text.
    5. **vocab**: Select exactly 5 challenging words. 
       - **word**: English word (e.g., "Identify").
       - **meaning**: Korean definition ONLY (e.g., "식별하다"). No English in this field.
    6. **summary**: 3-4 sentences in Korean summarizing the content.

    Ignore listening questions (1-17).
    Return the data as a JSON array.
  `;

  const thinkingConfig = useThinking
    ? { thinkingConfig: { thinkingBudget: 32768 } }
    : {};

  try {
    if (onProgress) onProgress(useThinking ? "Thinking deeply..." : "Initializing AI...", 5);

    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Pdf,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: examDataSchema,
        ...thinkingConfig,
      },
    });

    let fullText = '';
    let lastFoundId = '';

    for await (const chunk of responseStream) {
        const chunkText = chunk.text || '';
        fullText += chunkText;

        // Heuristic: Parse the incomplete JSON string to find the latest "id": "qXX"
        const idMatches = fullText.match(/"id":\s*"q(\d+)"/g);
        
        if (idMatches && idMatches.length > 0) {
            const lastMatch = idMatches[idMatches.length - 1]; // e.g. "id": "q25"
            const numberMatch = lastMatch.match(/\d+/);
            
            if (numberMatch) {
                const currentNum = parseInt(numberMatch[0], 10);
                const qId = `q${currentNum}`;
                
                if (qId !== lastFoundId) {
                    lastFoundId = qId;
                    // Estimate progress: roughly questions 18 to 45
                    let percent = Math.round(((currentNum - 17) / 28) * 100);
                    if (percent < 10) percent = 10;
                    if (percent > 95) percent = 95;

                    if (onProgress) {
                        onProgress(`Analyzing Question ${currentNum}...`, percent);
                    }
                }
            }
        } else {
             if (fullText.length > 50 && onProgress && !lastFoundId) {
                 onProgress("Reading PDF structure...", 10);
             }
        }
    }

    if (onProgress) onProgress("Finalizing data...", 98);

    let jsonString = fullText.trim();
    if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const parsed = JSON.parse(jsonString);
    
    if (onProgress) onProgress("Complete!", 100);
    
    return { questions: parsed };
    
  } catch (error) {
    console.error("Gemini PDF Parsing Error:", error);
    throw error;
  }
};

/**
 * Chat with Gemini about a specific question
 */
export const chatWithGemini = async (
    history: { role: 'user' | 'model', text: string }[],
    currentMessage: string,
    contextText: string,
    apiKey: string
  ) => {
    if (!apiKey) throw new Error("API Key is missing");
  
    const ai = new GoogleGenAI({ apiKey });
    const modelName = "gemini-2.5-flash"; 
  
    const systemInstruction = `
    You are a helpful English tutor for a Korean student. 
    The student is asking questions about this English passage: "${contextText}".
    
    Guidelines:
    - Answer clearly and concisely in Korean.
    - If explaining grammar, keep it simple.
    - Do not use complex Markdown. Use bolding for emphasis only if necessary.
    - Focus on speed and clarity.
    `;
  
    const chat = ai.chats.create({
        model: modelName,
        config: {
            systemInstruction,
        },
        history: history.map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
        }))
    });

    const result = await chat.sendMessage({ message: currentMessage });
    return result.text;
  };