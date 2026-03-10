import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, locales, type Locale } from "./config";

export default getRequestConfig(async () => {
  // 1. Try cookie
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  let locale: Locale = defaultLocale;

  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale;
  } else {
    // 2. Try Accept-Language header
    const headersList = await headers();
    const acceptLanguage = headersList.get("accept-language") ?? "";
    if (acceptLanguage.toLowerCase().includes("zh")) {
      locale = "zh";
    } else if (acceptLanguage.toLowerCase().includes("en")) {
      locale = "en";
    }
    // 3. Default: zh (already set above)
  }

  const messages = (await import(`./messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
