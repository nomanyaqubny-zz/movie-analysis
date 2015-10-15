# This file consists of an R Script to run when tweets about the movie has been inserted
#
# TAGS: 
# 1. REPLACE_TABLE_NAME
# 2. REPLACE_MOVIE_ID
# use above or add more TAGS and remember to replace them with proper values in twitterInsight.js: calculateDeclineRate 


library(ibmdbR)
con <- idaConnect("BLUDB","","")
idaInit(con)

#get tweets count per US state
tweetCountsPerState <- idaQuery("SELECT SMAAUTHORSTATE AS STATE, DATE(MSGPOSTEDTIME) AS DATE, COUNT(*) AS CNT FROM REPLACE_TABLE_NAME a INNER JOIN US_STATES b ON a.SMAAUTHORSTATE=b.STATE WHERE DATE(MSGPOSTEDTIME)>'2015-01-15' GROUP BY SMAAUTHORSTATE,DATE(MSGPOSTEDTIME) ORDER BY DATE")

#Calculate the decline of tweets between opening weekend and now
tweetCountsPerState$CNT <- as.numeric(tweetCountsPerState$CNT)
tweetCountsPerState <- na.omit(tweetCountsPerState)
x <- by(tweetCountsPerState,tweetCountsPerState$STATE,function(df){df[nrow(df),"CNT"]/df[1,"CNT"]}, simplify=F)
result <- data.frame(MOVIE_ID=REPLACE_MOVIE_ID,STATE_ISO=names(x),DECLINE_RATE=as.numeric(as.vector(x)))

#Write this to a db table
sqlSave(con, result, tablename = "TWEET_ALERTS", append = TRUE, rownames = FALSE)