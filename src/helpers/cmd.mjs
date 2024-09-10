import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export const getProfanityOption = (args) => {
  var value = getCmdOption(args, "--profanity");
  if (null === value) {
    return sdk.ProfanityOption.Masked;
  } else {
    switch (value.toLowerCase()) {
      case "raw":
        return sdk.ProfanityOption.Raw;
      case "remove":
        return sdk.ProfanityOption.Removed;
      default:
        return sdk.ProfanityOption.Masked;
    }
  }
};

export const getCmdOption = (args, option) => {
  var index = args.indexOf(option);
  if (index > -1 && index < args.length - 1) {
    // We found the option(for example, "--output"), so advance from that to the value(for example, "filename").
    return args[index + 1];
  } else {
    return null;
  }
};

export const hasCmdOption = (args, option) => {
  return args.includes(option);
};
