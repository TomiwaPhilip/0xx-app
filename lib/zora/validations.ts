import { validateMetadataJSON, validateMetadataURIContent, ValidMetadataJSON, ValidMetadataURI} from "@zoralabs/coins-sdk";

export const validateMetadata = (metadata: ValidMetadataJSON) => {
  const validation = validateMetadataJSON(metadata);
  if (!validation) {
    throw new Error("Invalid metadata");
  }
  return validation;
};

export function validateMetadataURI(uri: ValidMetadataURI) {
  const validation = validateMetadataURIContent(uri);
  if (!validation) {
    throw new Error("Invalid metadata URI");
  }
  return validation;
};
