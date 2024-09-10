import dotenv from "dotenv";
import fs from "fs";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import {
  getCmdOption,
  getProfanityOption,
  hasCmdOption,
} from "./helpers/cmd.mjs";

// TODO: move to helpers/date.ts
const dateToFormat = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const minute = d.getMinutes();
  const second = d.getSeconds();
  return `${year}-${month}-${day}-${hour}-${minute}-${second}`;
};

var BinaryFileReader = /** @class */ (function () {
  function BinaryFileReader(audioFileName) {
    this.m_fd = fs.openSync(audioFileName, "r");
  }
  // See:
  // https://javascript.info/arraybuffer-binary-arrays
  BinaryFileReader.prototype.read = function (dataBuffer) {
    var view = new Uint16Array(dataBuffer);
    var bytesRead = fs.readSync(this.m_fd, view);
    return bytesRead;
  };
  BinaryFileReader.prototype.close = function () {
    fs.closeSync(this.m_fd);
  };
  return BinaryFileReader;
})();

function ReadInt32(fd) {
  var buffer = Buffer.alloc(4);
  var bytesRead = fs.readSync(fd, buffer);
  if (4 != bytesRead) {
    throw (
      "Error reading 32-bit integer from .wav file header. Expected 4 bytes. Actual bytes read: " +
      String(bytesRead)
    );
  }
  return buffer.readInt32LE();
}

function ReadUInt16(fd) {
  var buffer = Buffer.alloc(2);
  var bytesRead = fs.readSync(fd, buffer);
  if (2 != bytesRead) {
    throw (
      "Error reading 16-bit unsigned integer from .wav file header. Expected 2 bytes. Actual bytes read: " +
      String(bytesRead)
    );
  }
  return buffer.readUInt16LE();
}

function ReadUInt32(fd) {
  var buffer = Buffer.alloc(4);
  var bytesRead = fs.readSync(fd, buffer);
  if (4 != bytesRead) {
    throw (
      "Error reading unsigned 32-bit integer from .wav file header. Expected 4 bytes. Actual bytes read: " +
      String(bytesRead)
    );
  }
  return buffer.readUInt32LE();
}

function ReadString(fd, length) {
  var buffer = Buffer.alloc(length);
  var bytesRead = fs.readSync(fd, buffer);
  if (length != bytesRead) {
    throw (
      "Error reading string from .wav file header. Expected " +
      String(length) +
      " bytes. Actual bytes read: " +
      String(bytesRead)
    );
  }
  return buffer.toString();
}

function ReadWavFileHeader(audioFileName) {
  var fd = fs.openSync(audioFileName, "r");

  if (ReadString(fd, 4) != "RIFF") {
    throw "Error reading .wav file header. Expected 'RIFF' tag.";
  }
  // File length
  ReadInt32(fd);
  if (ReadString(fd, 4) != "WAVE") {
    throw "Error reading .wav file header. Expected 'WAVE' tag.";
  }
  if (ReadString(fd, 4) != "fmt ") {
    throw "Error reading .wav file header. Expected 'fmt ' tag.";
  }
  // Format size
  var formatSize = ReadInt32(fd);
  if (formatSize > 16) {
    throw (
      "Error reading .wav file header. Expected format size 16 bytes. Actual size: " +
      String(formatSize)
    );
  }
  // Format tag
  ReadUInt16(fd);
  var nChannels = ReadUInt16(fd);
  var framerate = ReadUInt32(fd);
  // Average bytes per second
  ReadUInt32(fd);
  // Block align
  ReadUInt16(fd);
  var bitsPerSample = ReadUInt16(fd);

  fs.closeSync(fd);

  return {
    framerate: framerate,
    bitsPerSample: bitsPerSample,
    nChannels: nChannels,
  };
}

var newline = "\n";

function TimestampFromSpeechRecognitionResult(result, userConfig) {
  // Offset and duration are measured in 100-nanosecond increments. The Date constructor takes a value measured in milliseconds.
  // 100 nanoseconds is equal to a tick. There are 10,000 ticks in a millisecond.
  // See:
  // https://docs.microsoft.com/dotnet/api/system.timespan.ticks
  // https://docs.microsoft.com/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognitionresult
  var ticksPerMillisecond = 10000;
  var startTime = new Date(result.offset / ticksPerMillisecond);
  var endTime = new Date(
    result.offset / ticksPerMillisecond + result.duration / ticksPerMillisecond
  );
  // Note We must use getUTC* methods, or the results are adjusted for our local time zone, which we don't want.
  var start_hours = startTime.getUTCHours().toString().padStart(2, "0");
  var start_minutes = startTime.getUTCMinutes().toString().padStart(2, "0");
  var start_seconds = startTime.getUTCSeconds().toString().padStart(2, "0");
  var start_milliseconds = startTime
    .getUTCMilliseconds()
    .toString()
    .padStart(3, "0");
  var end_hours = endTime.getUTCHours().toString().padStart(2, "0");
  var end_minutes = endTime.getUTCMinutes().toString().padStart(2, "0");
  var end_seconds = endTime.getUTCSeconds().toString().padStart(2, "0");
  var end_milliseconds = endTime
    .getUTCMilliseconds()
    .toString()
    .padStart(3, "0");

  if (userConfig.isSrt) {
    // SRT format requires ',' as decimal separator rather than '.'.
    return `${start_hours}:${start_minutes}:${start_seconds},${start_milliseconds} --> ${end_hours}:${end_minutes}:${end_seconds},${end_milliseconds}`;
  } else {
    return `${start_hours}:${start_minutes}:${start_seconds}.${start_milliseconds} --> ${end_hours}:${end_minutes}:${end_seconds}.${end_milliseconds}`;
  }
}

function CaptionFromSpeechRecognitionResult(
  sequenceNumber,
  result,
  userConfig
) {
  var caption = "";
  if (!userConfig.showRecognizingResults && userConfig.isSrt) {
    caption += `${sequenceNumber}${newline}`;
  }
  caption += `${TimestampFromSpeechRecognitionResult(
    result,
    userConfig
  )}${newline}`;
  caption += `${result.text}${newline}${newline}`;
  return caption;
}

function writeToConsole(text, userConfig) {
  if (!userConfig.suppressConsoleOutput) {
    process.stdout.write(text);
  }
}

function writeToConsoleOrFile(text, userConfig) {
  writeToConsole(text, userConfig);
  if (userConfig.captionFile) {
    fs.appendFileSync(userConfig.captionFile, text);
  }
}

function init(userConfig) {
  if (!userConfig.isSrt) {
    writeToConsoleOrFile(`WEBVTT${newline}${newline}`, userConfig);
  }
}

function getUserConfig(args, usage) {
  const key = process.env.SPEECH_KEY;
  if (!key) {
    throw `Missing subscription key.${newline}${usage}`;
  }
  const region = process.env.SPEECH_REGION;
  if (!region) {
    throw `Missing region.${newline}${usage}`;
  }

  const captionFile = getCmdOption(args, "--captionDir")
    ? `${getCmdOption(args, "--captionDir")}/${dateToFormat(Date.now())}.srt`
    : null;
  return {
    profanityOption: getProfanityOption(args),
    inputFile: getCmdOption(args, "--audio"),
    captionFile: captionFile,
    phraseList: getCmdOption(args, "--phrases"),
    suppressConsoleOutput: hasCmdOption(args, "--quiet"),
    showRecognizingResults: hasCmdOption(args, "--recognizing"),
    stablePartialResultThreshold: getCmdOption(args, "--threshold"),
    isSrt: hasCmdOption(args, "--srt"),
    subscriptionKey: key,
    region: region,
  };
}

function AudioConfigFromUserConfig(userConfig) {
  if (userConfig.inputFile) {
    var header = ReadWavFileHeader(userConfig.inputFile);
    var format = sdk.AudioStreamFormat.getWaveFormatPCM(
      header.framerate,
      header.bitsPerSample,
      header.nChannels
    );
    var callback = new BinaryFileReader(userConfig.inputFile);
    var stream = sdk.AudioInputStream.createPullStream(callback, format);
    return sdk.AudioConfig.fromStreamInput(stream);
  } else {
    return sdk.AudioConfig.fromDefaultMicrophoneInput();
  }
}

function SpeechConfigFromUserConfig(userConfig) {
  var speechConfig = sdk.SpeechConfig.fromSubscription(
    userConfig.subscriptionKey,
    userConfig.region
  );

  speechConfig.setProfanity(userConfig.profanityOption);

  if (userConfig.stablePartialResultThreshold) {
    speechConfig.setProperty(
      "SpeechServiceResponse_StablePartialResultThreshold",
      userConfig.stablePartialResultThreshold
    );
  }

  speechConfig.setProperty(
    "SpeechServiceResponse_PostProcessingOption",
    "TrueText"
  );

  return speechConfig;
}

function SpeechRecognizerFromUserConfig(userConfig) {
  var audioConfig = AudioConfigFromUserConfig(userConfig);
  var speechConfig = SpeechConfigFromUserConfig(userConfig);
  var speechRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  if (userConfig.phraseList) {
    var grammar = sdk.PhraseListGrammar.fromRecognizer(speechRecognizer);
    grammar.addPhrase(userConfig.phraseList);
  }

  return speechRecognizer;
}

// See:
// https://docs.microsoft.com/azure/cognitive-services/speech-service/how-to-recognize-speech
function RecognizeContinuous(speechRecognizer, userConfig) {
  var sequenceNumber = 0;

  if (userConfig.showRecognizingResults) {
    speechRecognizer.recognizing = function (s, e) {
      if (
        sdk.ResultReason.RecognizingSpeech == e.result.reason &&
        e.result.text.length > 0
      ) {
        // We don't show sequence numbers for partial results.
        writeToConsole(
          CaptionFromSpeechRecognitionResult(0, e.result, userConfig),
          userConfig
        );
      } else if (sdk.ResultReason.NoMatch == e.result.reason) {
        writeToConsole(
          `NOMATCH: Speech could not be recognized.${newline}`,
          userConfig
        );
      }
    };
  }

  speechRecognizer.recognized = function (s, e) {
    if (
      sdk.ResultReason.RecognizedSpeech == e.result.reason &&
      e.result.text.length > 0
    ) {
      sequenceNumber++;
      writeToConsoleOrFile(
        CaptionFromSpeechRecognitionResult(
          sequenceNumber,
          e.result,
          userConfig
        ),
        userConfig
      );
    } else if (sdk.ResultReason.NoMatch == e.result.reason) {
      writeToConsole(
        `NOMATCH: Speech could not be recognized.${newline}`,
        userConfig
      );
    }
  };

  speechRecognizer.canceled = (s, e) => {
    if (sdk.CancellationReason.EndOfStream == e.reason) {
      writeToConsole(`End of stream reached.${newline}`, userConfig);
    } else if (sdk.CancellationReason.Error == e.reason) {
      var error = `Encountered error.${newline}Error code: ${e.errorCode}${newline}Error details: ${e.errorDetails}${newline}`;
    } else {
      var error = `Request was cancelled for an unrecognized reason: ${e.reason}.${newline}`;
    }

    speechRecognizer.stopContinuousRecognitionAsync();
  };

  speechRecognizer.sessionStopped = (s, e) => {
    writeToConsole(`Session stopped.${newline}`, userConfig);

    speechRecognizer.stopContinuousRecognitionAsync();
  };

  speechRecognizer.startContinuousRecognitionAsync();
}

function main(args) {
  var usage = `Usage: node captioning.js [...]

  HELP
    --help                        Show this help and stop.

  INPUT
    --audio FILE                  Input audio from file (default input is the microphone.)

  RECOGNITION
    --recognizing                 Output Recognizing results (default output is Recognized results only.)
                                  These are always written to the console, never to an output file.
                                  --quiet overrides this.

  ACCURACY
    --phrases PHRASE1;PHRASE2     Example: Constoso;Jessie;Rehaan

  OUTPUT
    --captionDir DIR                 Output captions to directory.
    --srt                         Output captions in SubRip Text format (default format is WebVTT.)
    --quiet                       Suppress console output, except errors.
    --profanity OPTION            Valid values: raw, remove, mask
    --threshold NUMBER            Set stable partial result threshold.
                                  Default value: 3
`;

  dotenv.config();
  if (hasCmdOption(args, "--help")) {
    console.log(usage);
  } else {
    const userConfig = getUserConfig(args, usage);
    init(userConfig);
    var audio_config = AudioConfigFromUserConfig(userConfig);
    var speechRecognizer = SpeechRecognizerFromUserConfig(userConfig);
    RecognizeContinuous(speechRecognizer, userConfig);
  }
}

main(process.argv);
