import { Typography } from "@mui/material";
import { useDaoMetadataQuery } from "query";
import { useIntersectionObserver } from "react-intersection-observer-hook";
import { useAppNavigation } from "router";
import { StyledFlexColumn } from "styles";
import { Address } from "ton-core";
import { makeElipsisAddress } from "utils";
import { StyledDao, StyledDaoAvatar, StyledDaoContent, StyledJoinDao } from "./styles";



export const Dao = ({ address }: { address: Address }) => {
  const [ref, { entry }] = useIntersectionObserver();
  const isVisible = entry && entry.isIntersecting;
  const { spacePage } = useAppNavigation();
  const { data: daoMetadata } = useDaoMetadataQuery(address.toString());

  const navigate = () => {
    if (!daoMetadata) return;
    spacePage.root(daoMetadata.name.toLowerCase());
  };

  return (
    <StyledDao ref={ref} onClick={navigate}>
      <StyledDaoContent className="container">
        {isVisible ? (
          <StyledFlexColumn>
            <StyledDaoAvatar src={daoMetadata?.avatar} />
            <StyledFlexColumn>
              <Typography className="title">
                {makeElipsisAddress(daoMetadata?.name, 5)}
              </Typography>
              {/* <Typography className="members">
                {nFormatter(dao.members)} members
              </Typography> */}
              <StyledJoinDao>Join</StyledJoinDao>
            </StyledFlexColumn>
          </StyledFlexColumn>
        ) : null}
      </StyledDaoContent>
    </StyledDao>
  );
};



