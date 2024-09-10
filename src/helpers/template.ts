import { checkRepeatedLines } from "./check-repeat";

const script = `<!--ID=B7267351-473F-409D-9765-754A8EBCDE05;Version=1|{"VoiceNameToIdMapItems":[{"Id":"0c9aeff2-a86f-4b3c-ad09-6dccc70e9bb5","Name":"Microsoft Server Speech Text to Speech Voice (zh-CN, YunzeNeural)","ShortName":"zh-CN-YunzeNeural","Locale":"zh-CN","VoiceType":"StandardVoice"}]}-->
<!--ID=FCB40C2B-1F9F-4C26-B1A1-CF8E67BE07D1;Version=1|{"Files":{}}-->
<!--ID=5B95B1CC-2C7B-494F-B746-CF22A0E779B7;Version=1|{"Locales":{"af-ZA":{"AutoApplyCustomLexiconFiles":[{}]},"zh-CN":{"AutoApplyCustomLexiconFiles":[{}]}}}-->
<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="zh-CN"><voice name="zh-CN-YunzeNeural">
{quotes}
</voice>
</speak>`;
const sentence = `<mstts:express-as style="documentary-narration">{quote}</mstts:express-as><s />`;

export const parse = (rawText: string) => {
  const quotes = checkRepeatedLines(rawText);
  const output = quotes.map((quote) => sentence.replace("{quote}", quote));
  const parsed = script.replace("{quotes}", output.join("\n"));
  return parsed;
};
