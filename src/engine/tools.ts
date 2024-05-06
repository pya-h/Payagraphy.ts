export const now = (inMilisec: boolean = false) =>
    !inMilisec ? (Date.now() / 1000) | 0 : Date.now();

export const minutesToTimestamp = (minutes: number) => {
    let hours = (minutes / 60) | 0;
    minutes -= hours * 60;
    let timestamp: string = `${minutes} Minute${minutes > 1 ? "s" : ""}`;
    if (hours > 0) {
        let days = (hours / 24) | 0;
        hours -= days * 24;
        timestamp = `${hours} Hour${hours > 1 ? "s" : ""} And {timestamp}`;
        if (days > 0) {
            timestamp = `${days} Day${days > 1 ? "s" : ""}, ${timestamp}`;
            //  months = days // 30
            //  days -= months * 30
            // //   how about 31 days month and 29?
            //  if
            //  else:
        }
    }
    return timestamp;
};

export class ParallelJob {
    protected _lastAchievment: any;
    protected _lastDutyTime: number;
    protected _running: boolean;
    protected _dutyParameters: any[];
    protected _interval: number;
    protected _duty: (...params: any[]) => any;
    protected _useMiliseconds: boolean = false;

    // Define objects from this and use it in TelegramBot, it will does some parallel jobs in the bot by a specific interval [in minutes]
    constructor(interval: number, duty: (...params: any[]) => any, ...params: any[]) {
        this._interval = interval;
        this._duty = duty;
        this._dutyParameters = params;
        this._lastAchievment = null;
        this._lastDutyTime = 0;
        this._running = false;
    }

    /**
     * Changes the unit of interval from seconds to miliseconds
     */
    beMorePrecise() {
        this._useMiliseconds = true;
        this._interval *= 1000;
    }

    go(): ParallelJob {
        // Start running...
        this._lastDutyTime = now(this._useMiliseconds);
        this._running = true;
        return this;
    }

    async do(): Promise<void> {
        this._lastAchievment = await this._duty(...this._dutyParameters);
        this._lastDutyTime = now(this._useMiliseconds);
    }

    stop(): void {
        this._running = false;
    }

    get lastAchievment(): any {
        return this._lastAchievment;
    }

    get lastDutyTime(): number {
        return this._lastDutyTime;
    }

    get running(): boolean {
        return this._running;
    }

    get interval() {
        return this._interval;
    }

    shouldRun() {
        return (
            this.running &&
            now(this._useMiliseconds) - this.lastDutyTime >= this.interval
        );
    }
}

export class Planner {
    protected lastCallResult: any;
    protected isRunning: boolean = false;
    protected startedAt: number;
    protected timerId: number;
    protected params: any[];

    constructor(
        protected interval: number,
        protected action: (...params: any[]) => any,
        ...params: any[]
    ) {
        this.params = params;
    }

    start() {
        if (this.isRunning) return;
        // TODO: Make async using crons
        this.timerId = setInterval(() => this.execute(), this.interval * 1000);
        this.startedAt = Date.now();
        this.isRunning = true;
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        clearInterval(this.timerId);
        this.timerId = 0;
    }

    async execute() {
        this.lastCallResult = this.params ? await this.action(...this.params) : await this.action();
    }

    minutesRunning(): number {
        return (Date.now() - this.startedAt) / (60 * 1000);
    }
}
