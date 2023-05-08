import { Chip, Typography } from "@mui/material";
import { styled } from "@mui/material";
import {
  Button,
  LoadingContainer,
  Markdown,
  OverflowWithTooltip,
  Progress,
  TitleContainer,
} from "components";
import { StyledFlexColumn, StyledFlexRow } from "styles";
import { BsFillCheckCircleFill } from "react-icons/bs";
import { AiFillCloseCircle } from "react-icons/ai";
import { useEffect, useMemo, useState } from "react";
import {
  calculateTonAmount,
  getSymbol,
  getTonAmounFromSumCoins,
  getVoteStrategyType,
  nFormatter,
  normalizeResults,
} from "utils";
import _ from "lodash";
import { useVerifyProposalResults } from "./hooks";
import { EndpointPopup } from "./EndpointPopup";
import { useProposalPageQuery } from "./query";
import BigNumber from "bignumber.js";
import { useProposalPageTranslations } from "i18n/hooks/useProposalPageTranslations";

export const Results = () => {
  const { data, dataUpdatedAt, isLoading } = useProposalPageQuery(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const translations = useProposalPageTranslations();
  const proposalResult = data?.proposalResult;
  const sumCoins = data?.sumCoins;
  const sumVotes = data?.sumVotes;

  const votes = data?.votes;

  const votingPowerStrategy = getVoteStrategyType(
    data?.metadata?.votingPowerStrategies
  );
  const symbol = getSymbol(votingPowerStrategy);

  const votesCount = useMemo(() => {
    const result = _.mapValues(_.groupBy(votes, "vote"), (value, key) => {
      return _.size(value);
    });

    return _.mapKeys(result, (_, key) => {
      return key.toLowerCase();
    });
  }, [dataUpdatedAt]);

  if (isLoading) {
    return <LoadingContainer />;
  }

  const totalWeight = proposalResult?.totalWeight;

  const LIMIT = 5;

  const normalizedResults = useMemo(
    () => normalizeResults(proposalResult),
    [dataUpdatedAt]
  );

  return (
    <StyledResults title={translations.results}>
      <StyledFlexColumn gap={15}>
        {normalizedResults.map((item, index) => {
          if (index >= LIMIT && !showAllResults) return null;
          const { title, percent } = item;

          const votes = sumVotes
            ? sumVotes[title]
            : votesCount[title as keyof typeof votesCount];
          const tonAmount = sumCoins
            ? getTonAmounFromSumCoins(sumCoins[title] as BigNumber)
            : calculateTonAmount(percent, totalWeight as string);

          return (
            <ResultRow
              key={title}
              symbol={symbol}
              name={title}
              percent={percent}
              tonAmount={tonAmount}
              votes={votes}
            />
          );
        })}

        {_.size(normalizedResults) > LIMIT && (
          <ToggleResultsButton
            toggle={setShowAllResults}
            value={showAllResults}
          />
        )}
      </StyledFlexColumn>
      <VerifyResults />
    </StyledResults>
  );
};

const ToggleResultsButton = ({
  toggle,
  value,
}: {
  toggle: (value: boolean) => void;
  value: boolean;
}) => {
  const translations = useProposalPageTranslations();
  return (
    <StyledToggleResultsButton onClick={() => toggle(!value)}>
      {value ? translations.showLess : translations.showMore}
    </StyledToggleResultsButton>
  );
};

const StyledToggleResultsButton = styled(Button)({
  padding: "6px 10px",
  height: "unset",
  marginLeft: "auto",
  "*": {
    fontSize: 12,
  },
});

const ResultRow = ({
  name,
  percent = 0,
  tonAmount = "0",
  votes,
  symbol,
}: {
  name: string;
  percent?: number;
  tonAmount?: string;
  votes: number;
  symbol?: string | null;
}) => {
  const translations = useProposalPageTranslations();
  return (
    <StyledResultRow>
      <StyledFlexRow justifyContent="space-between" width="100%">
        <StyledFlexRow style={{ width: "fit-content" }}>
          <div>
            <StyledTitle text={name} />
          </div>
          <StyledChip label={`${nFormatter(votes, 2)} ${translations.votes}`} />
        </StyledFlexRow>

        <StyledResultRowRight justifyContent="flex-end">
          {symbol && (
            <Typography fontSize={13} style={{ whiteSpace: "nowrap" }}>
              {tonAmount} {symbol}
            </Typography>
          )}

          <Typography className="percent">{percent}%</Typography>
        </StyledResultRowRight>
      </StyledFlexRow>
      <Progress progress={percent} />
    </StyledResultRow>
  );
};

const StyledTitle = styled(OverflowWithTooltip)({
  textTransform: "capitalize",
});

const StyledChip = styled(Chip)({
  fontSize: 11,
  height: 25,
  ".MuiChip-label": {
    paddingLeft: 10,
    paddingRight: 10,
  },
});

const StyledResultRowRight = styled(StyledFlexRow)({
  flex: 1,
});

const StyledResultRow = styled(StyledFlexColumn)({
  gap: 5,
  fontWeight: 600,
  p: {
    fontWeight: "inherit",
  },
  ".percent": {
    fontSize: 14,
  },
});

const StyledResults = styled(TitleContainer)({
  width: "100%",
});

export function VerifyResults() {
  const {
    mutate: verify,
    isLoading,
    error,
    isSuccess,
    reset,
  } = useVerifyProposalResults();
  const translations = useProposalPageTranslations();
  useEffect(() => {
    if (isSuccess || error) {
      setTimeout(() => {
        reset();
      }, 5_000);
    }
  }, [isSuccess, reset, error]);

  const [open, setOpen] = useState(false);

  const onClick = () => setOpen(true);

  return (
    <StyledVerifyContainer>
      <StyledVerifyText>{translations.verifyInfo}</StyledVerifyText>
      <EndpointPopup
        onSubmit={verify}
        open={open}
        onClose={() => setOpen(false)}
      />
      {isSuccess ? (
        <StyledButton>
          <StyledFlexRow>
            <Typography>Verified</Typography>
            <BsFillCheckCircleFill className="icon" />
          </StyledFlexRow>
        </StyledButton>
      ) : error ? (
        <StyledButton>
          <StyledFlexRow>
            <Typography>Not Verified</Typography>
            <AiFillCloseCircle className="icon" />
          </StyledFlexRow>
        </StyledButton>
      ) : (
        <StyledButton onClick={onClick} isLoading={isLoading}>
          <Typography>{translations.verifyResults}</Typography>
        </StyledButton>
      )}
    </StyledVerifyContainer>
  );
}

const StyledVerifyContainer = styled(StyledFlexColumn)(({ theme }) => ({
  marginTop: 30,
  justifyContent: "center",
  width: "100%",
  gap: 15,
}));

const StyledVerifyText = styled(Markdown)({
  fontWeight: 500,
  a: {
    textDecoration: "unset",
  },
});

const StyledButton = styled(Button)({
  height: 40,
  minWidth: 180,
  "*": {
    fontSize: 15,
  },
  ".icon": {
    width: 18,
    height: 18,
    position: "relative",
    top: -1,
  },
  ".loader": {
    maxWidth: 20,
    maxHeight: 20,
  },
});
