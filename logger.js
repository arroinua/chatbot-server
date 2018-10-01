const winston = require('winston');
const config = require('./config');

const timestampFn = function(){ return new Date(); };
const errorFormatter = function(options) {
    // Return string will be passed to logger.
    return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (undefined !== options.message ? options.message : '') +
      (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' ) +' '+options.stack;
};

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            colorize: true
        }),
        new winston.transports.File({
            level: 'error',
            filename: config.log_path+'/error.log',
            maxsize: config.log_max_size,
            maxFiles: 5,
            json: true,
            handleExceptions: true,
            timestamp: timestampFn,
            prettyPrint: true
        })
    ],
    exitOnError: false
});

module.exports = logger;