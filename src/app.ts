import dotenv from "dotenv";
import fs from "fs";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { dateToFormat } from "./helpers/date";
import { parse } from "./helpers/template";

const app = async () => {
  dotenv.config();

  const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.SPEECH_KEY || "",
    process.env.SPEECH_REGION || ""
  );
  speechConfig.speechSynthesisVoiceName = process.env.VOICE_NAME || "";

  // Create output directory if not exists
  if (!fs.existsSync(process.env.OUTPUT_DIR || "output"))
    fs.mkdirSync(process.env.OUTPUT_DIR || "output");

  const audioFile = `${process.env.OUTPUT_DIR || "output"}/${dateToFormat(
    Date.now()
  )}.wav`;
  const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFile);

  // Create the speech synthesizer.
  let synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

  // Read the text from the file
  const text = fs.readFileSync("text.txt", "utf8");
  const parsedText = parse(text);

  // Start the synthesizer and wait for a result.
  await synthesizer.speakSsmlAsync(
    parsedText,
    (result) => {
      if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
        console.log("synthesis finished.");
      } else {
        console.error(
          "Speech synthesis canceled, " +
            result.errorDetails +
            "\nDid you set the speech resource key and region values?"
        );
      }
      synthesizer.close();
    },
    (err) => {
      console.trace("err - " + err);
      synthesizer.close();
    }
  );
};

app();
