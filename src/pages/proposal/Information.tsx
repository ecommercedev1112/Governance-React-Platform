import { Box, styled, Typography } from "@mui/material";
import { Container, Link } from "components";
import { ReactNode } from "react";
import { StyledFlexColumn, StyledFlexRow, textOverflow } from "styles";
import moment from "moment";
import { TONSCAN_ADDRESS_URL } from "config";
import { makeElipsisAddress } from "utils";
import { useProposalId } from "hooks";
import { useProposalInfoQuery } from "./hooks";

 const fromUnixToString = (
  time: number,
  format = "MMM DD, YYYY HH:mm"
) => {
  return `${moment.unix(time).utc().format(format)} UTC`;
};


export const Information = () => {
  const { data: proposalInfo, isLoading } = useProposalInfoQuery();
  const proposalId = useProposalId()
  
    return (
      <StyledInformation
        title="Information"
        loaderAmount={3}
        loading={isLoading}
      >
        {proposalInfo && (
          <StyledFlexColumn gap={12}>
            <InformationRow label="Start date">
              <Typography>
                {fromUnixToString(Number(proposalInfo.startTime))}
              </Typography>
            </InformationRow>
            <InformationRow label="End date">
              <Typography>
                {fromUnixToString(Number(proposalInfo.endTime))}
              </Typography>
            </InformationRow>

            <InformationRow label="Snapshot">
              <Typography>
                {fromUnixToString(Number(proposalInfo.snapshot.snapshotTime))}
              </Typography>
            </InformationRow>
            <InformationRow label="Contract">
              <Link href={`${TONSCAN_ADDRESS_URL}/${proposalId}`}>
                {makeElipsisAddress(proposalId, 8)}
              </Link>
            </InformationRow>
          </StyledFlexColumn>
        )}
      </StyledInformation>
    );
};

const InformationRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => {
  return (
    <StyledFlexRow className="row" justifyContent="space-between">
      <Typography className="row-label">{label}</Typography>
      <Box className="row-children">{children}</Box>
    </StyledFlexRow>
  );
};


const StyledInformation = styled(Container)({
  width: "100%",
  ".row": {
    width: "100%",
    ".row-label": {
      fontSize: 14,
      fontWeight: 700,
    },
    ".row-children": {
      ...textOverflow,
      maxWidth: '60%',
      "*": {
        fontSize: 14,
        fontWeight: 400,
      },
    },
  },
});
