import { Box, styled, Typography } from "@mui/material";
import {
  AddressDisplay,
  Button,
  FormikInputsForm,
  Img,
  Link,
  Markdown,
  TitleContainer,
} from "components";
import { StyledFlexColumn } from "styles";
import {
  DaoMetadata,
  RolesForm,
  useCreatDaoStore,
  useCreateDao,
} from "../store";
import { Submit } from "./Submit";
import { MetadataArgs } from "ton-vote-contracts-sdk";
import { InputArgs } from "types";
import _ from "lodash";
import { useCreateDaoTranslations } from "i18n/hooks/useCreateDaoTranslations";
import { useCommonTranslations } from "i18n/hooks/useCommonTranslations";
import { useInputs } from "../form/inputs";

export function CreateDaoStep() {
  const { mutate: createDao, isLoading } = useCreateDao();
  const translations = useCreateDaoTranslations();
    const commonTranslations = useCommonTranslations();

  const { daoMetadataForm, rolesForm } = useCreatDaoStore();

  const { setRolesForm, createMetadataForm } = useInputs();

  return (
    <TitleContainer title={translations.createSpace}>
      <StyledFlexColumn>
        <StyledInputs>
          <>
            {setRolesForm.map((section) => {
              return section.inputs.map((input) => {
                const name = input.name as keyof RolesForm;

                return (
                  <InputPreview
                    key={input.name}
                    input={input}
                    value={rolesForm[name]}
                  />
                );
              });
            })}
            {createMetadataForm.map((section) => {
              return section.inputs.map((input) => {
                const name = input.name as keyof MetadataArgs;

                return (
                  <InputPreview
                    key={input.name}
                    input={input}
                    value={daoMetadataForm[name]}
                  />
                );
              });
            })}
          </>
        </StyledInputs>
        <Submit>
          <Button isLoading={isLoading} onClick={() => createDao()}>
            {commonTranslations.create}
          </Button>
        </Submit>
      </StyledFlexColumn>
    </TitleContainer>
  );
}

const StyledInputs = styled(StyledFlexColumn)({
  gap: 20,
});

const InputPreview = ({ input, value }: { input: InputArgs; value: any }) => {
  const getValue = () => {
    if (input.type === "checkbox") {
      return <Typography>{value ? "Yes" : "No"}</Typography>;
    }
    if (!value) return null;
    if (input.type === "url") {
      return <StyledLink href={value}>{value}</StyledLink>;
    }
    if (input.type === "image") {
      return <StyledImage src={value} />;
    }
    if (input.type === "address") {
      return <AddressDisplay padding={10} address={value} />;
    }

    if (input.type === "textarea") {
      return <StyledMd>{value}</StyledMd>;
    }
    return <Typography>{value}</Typography>;
  };

  const component = getValue();
  if (!component) return null;
  return (
    <StyledInputPreview>
      <Typography className="label">{`${input.label}`}</Typography>
      <StyledInputPreviewComponent>{component}</StyledInputPreviewComponent>
    </StyledInputPreview>
  );
};

const StyledInputPreviewComponent = styled(Box)({
  borderRadius: 10,
  border: "1px solid rgba(0, 0, 0, 0.23)",
  width: "100%",
  padding: 10,
});

const StyledImage = styled(Img)({
  width: 45,
  height: 45,
  borderRadius: "50%",
  overflow: "hidden",
});

const StyledLink = styled(Link)({
  width: "auto",
});

const StyledMd = styled(Markdown)({
  width: "100%",
});

const StyledInputPreview = styled(StyledFlexColumn)({
  flexWrap: "wrap",
  alignItems: "flex-start",
  justifyContent: "flex-start",
  gap: 5,
  fontSize: 16,
  ".label": {
    fontSize: 14,
    fontWeight: 600,
  },
});
