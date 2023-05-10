import { ErrorContainer } from "components";
import { APP_NAME } from "config";
import { useDaoPageTranslations } from "i18n/hooks/useDaoPageTranslations";
import { useDaoFromQueryParam } from "query/queries";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Outlet } from "react-router-dom";
import { parseLanguage } from "utils";

export function DaoPage() {
  const { data, error } = useDaoFromQueryParam();
  const [showError, setShowError] = useState(false);
  const translations = useDaoPageTranslations()
  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);

  return (
    <>
      <Helmet>
        <title>
          {APP_NAME}
          {data ? ` - ${parseLanguage(data.daoMetadata.name)}` : ""}
        </title>
      </Helmet>
      {showError ? (
        <ErrorContainer text={translations.spaceNotFound} />
      ) : (
        <Outlet />
      )}
    </>
  );
}
