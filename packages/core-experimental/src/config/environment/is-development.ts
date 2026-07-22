import { getEnvironmentConfig } from "./definitions"

const isDevelopment = (): boolean =>
    getEnvironmentConfig().shared.config.env === "development"

export { isDevelopment }
