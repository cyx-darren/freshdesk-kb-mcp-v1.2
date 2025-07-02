const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logLevels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };

        // Use different log directories based on environment
        if (process.env.NODE_ENV === 'production') {
            // In production/Docker, use /tmp which is writable
            this.logDir = '/tmp/logs';
        } else {
            // In development, use relative path
            this.logDir = path.join(__dirname, '../logs');
        }

        // Try to create logs directory, but don't fail if we can't
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
            this.logFile = path.join(this.logDir, 'discord-bot.log');
            this.fileLoggingEnabled = true;
        } catch (error) {
            console.warn('File logging disabled - could not create log directory:', error.message);
            this.fileLoggingEnabled = false;
        }
    }

    shouldLog(level) {
        return this.logLevels[level] <= this.logLevels[this.logLevel];
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        
        let formattedMessage = `${prefix} ${message}`;
        
        if (data) {
            if (typeof data === 'object') {
                formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
            } else {
                formattedMessage += ` ${data}`;
            }
        }
        
        return formattedMessage;
    }

    writeToFile(message) {
        // Only write to file if file logging is enabled
        if (!this.fileLoggingEnabled) return;
        
        try {
            fs.appendFileSync(this.logFile, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
            // Disable file logging if we encounter errors
            this.fileLoggingEnabled = false;
        }
    }

    log(level, message, data = null) {
        if (!this.shouldLog(level)) return;

        const formattedMessage = this.formatMessage(level, message, data);
        
        // Write to file
        this.writeToFile(formattedMessage);
        
        // Console output with colors
        switch (level) {
            case 'error':
                console.error(`\x1b[31m${formattedMessage}\x1b[0m`);
                break;
            case 'warn':
                console.warn(`\x1b[33m${formattedMessage}\x1b[0m`);
                break;
            case 'info':
                console.info(`\x1b[36m${formattedMessage}\x1b[0m`);
                break;
            case 'debug':
                console.debug(`\x1b[37m${formattedMessage}\x1b[0m`);
                break;
            default:
                console.log(formattedMessage);
        }
    }

    error(message, data = null) {
        this.log('error', message, data);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    debug(message, data = null) {
        this.log('debug', message, data);
    }

    // Discord-specific logging methods
    discordEvent(event, data = null) {
        this.info(`Discord Event: ${event}`, data);
    }

    discordError(event, error) {
        this.error(`Discord Error in ${event}:`, {
            message: error.message,
            stack: error.stack
        });
    }

    userAction(action, userId, username, data = null) {
        this.info(`User Action: ${action}`, {
            userId,
            username,
            ...data
        });
    }

    apiCall(method, url, status, duration = null) {
        const data = { method, url, status };
        if (duration) data.duration = `${duration}ms`;
        
        if (status >= 400) {
            this.warn('API Call Failed', data);
        } else {
            this.debug('API Call', data);
        }
    }
}

module.exports = new Logger(); 