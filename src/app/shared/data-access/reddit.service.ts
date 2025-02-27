import { computed, inject, Injectable, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Gif, RedditPost, RedditResponse } from "../interfaces";
import {
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  expand,
  map,
  merge,
  startWith,
  Subject,
  switchMap
} from "rxjs";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { FormControl } from "@angular/forms";
import { SubredditsList } from "@shared/constants/lists";
import { connect } from "ngxtension/connect";

export interface GifsState {
  gifs: Gif[],
  error: string | null;
  loading: boolean;
  lastKnownGif: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class RedditService {
  private http = inject(HttpClient);
  subredditFormControl = new FormControl();

  defaultSubreddit = this.getRandomSubreddit();

  //#region state
  private state = signal<GifsState>({
    gifs: [],
    error: null,
    loading: false,
    lastKnownGif: null,
  });
  //#endregion

  //#region selectors
  gifs = computed(() => this.state().gifs);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);
  lastKnownGif = computed(() => this.state().lastKnownGif);
  //#endregion

  //#region sources
  pagination$ = new Subject<string | null>();

  randomSubreddit$ = new Subject<void>();
  
  private subredditChanged$ = this.subredditFormControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    startWith(this.defaultSubreddit),
    map((subreddit) => (subreddit ? subreddit : this.defaultSubreddit))
  );

  private gifsLoaded$ = this.subredditChanged$.pipe(
    switchMap((subreddit) => 
      this.pagination$.pipe(
        startWith(null),
        concatMap((lastKnownGif) => this.fetchFromReddit(subreddit, lastKnownGif, 20).pipe(
          expand((response, index) => {
            const { gifs, gifsRequired, lastKnownGif } = response;
            const remainingGifsToFetch = gifsRequired - gifs.length;
            const maxAttempts = 15;

            const shouldKeepTrying = remainingGifsToFetch > 0 && index < maxAttempts && lastKnownGif !== null;

            return shouldKeepTrying ? this.fetchFromReddit(subreddit, lastKnownGif, remainingGifsToFetch) : EMPTY;
          })
        ))
      ))
  );

  private error$ = new Subject<string | null>();
  //#endregion

  constructor() {
    //#region reducers
    const nextState$ = merge(
      this.subredditChanged$.pipe(
        map(() => ({
          loading: true,
          gifs: [],
          lastKnownGif: null,
        }))
      ),
      this.error$.pipe(map((error) => ({ error }))),
    );

    connect(this.state)
      .with(nextState$)
      .with(this.gifsLoaded$, (state, response) => ({
        gifs: [...state.gifs, ...response.gifs],
        loading: false,
        lastKnownGif: response.lastKnownGif,
      }));

    this.randomSubreddit$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.subredditFormControl.patchValue(this.getRandomSubreddit());
    });
    //#endregion
  }
  
  private fetchFromReddit(subreddit: string, after: string | null, gifsRequired: number) {
    return this.http
    .get<RedditResponse>(`https://www.reddit.com/r/${subreddit}/hot/.json?limit=100` + (after ? `&after=${after}` : ''))
    .pipe(
      catchError((err) => {
        this.handleError(err);
        return EMPTY;
      }),
      map((response) => {
        const posts = response.data.children;
        const lastKnownGif = posts.length ? posts[posts.length - 1].data.name : null;
        
        return {
          gifs: this.convertRedditPostsToGifs(response.data.children),
          gifsRequired,
          lastKnownGif,
        };
      })
    );
  }
  
  private convertRedditPostsToGifs(posts: RedditPost[]): Gif[] {
    const defaultThumbnails = ['default', 'none', 'nsfw'];
    
    return posts.map((post) => {
      const thumbnail = post.data.thumbnail;
      const modifiedThumbnail= defaultThumbnails.includes(thumbnail)
      ? `/assets/${thumbnail}.png`
      : thumbnail;
      
      const validThumbnail = modifiedThumbnail.endsWith('.jpg') || modifiedThumbnail.endsWith('.png');
      
      return {
        src: this.getBestSrcForGif(post),
        author: post.data.author,
        name: post.data.name,
        permalink: post.data.permalink,
        title: post.data.title,
        thumbnail: validThumbnail ? modifiedThumbnail : `/assets/default.png`,
        comments: post.data.num_comments,
      };
    })
    .filter((post): post is Gif => post.src !== null);
  }
  
  private getBestSrcForGif(post: RedditPost): string | null{
    if (post.data.url.indexOf('.mp4') > -1) {
      return post.data.url;
    }
    
    if (post.data.url.indexOf('.gifv') > -1) {
      return post.data.url.replace('.gifv', '.mp4');
    }
    
    if (post.data.url.indexOf('.webm') > -1) {
      return post.data.url.replace('.webm', '.mp4');
    }
    
    if (post.data.secure_media?.reddit_video) {
      return post.data.secure_media.reddit_video.fallback_url;
    }
    
    if (post.data.media?.reddit_video) {
      return post.data.media.reddit_video.fallback_url;
    }
    
    if (post.data.preview?.reddit_video_preview) {
      return post.data.preview.reddit_video_preview.fallback_url;
    }
    
    return null;
  }
  
  private handleError(err: HttpErrorResponse) {
    if (err.status === 404 && err.url) {
      this.error$.next(`Failed to load gifs for /r/${err.url.split('/')[4]}`);
      return;
    }
    
    this.error$.next(err.statusText);
  }

  private getRandomSubreddit() {
    var subr = SubredditsList();
    return subr[Math.floor(Math.random() * subr.length)];
  }
}