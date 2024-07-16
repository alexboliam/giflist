import { computed, inject, Injectable, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Gif, RedditPost, RedditResponse } from "../interfaces";
import { catchError, concatMap, debounceTime, distinctUntilChanged, EMPTY, map, Observable, of, startWith, Subject, switchMap } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { FormControl } from "@angular/forms";

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

  defaultSubreddit = 'gifs';

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
        concatMap((lastKnownGif) => this.fetchFromReddit(subreddit, lastKnownGif, 20))
      ))
  );
  //#endregion

  constructor() {
    //#region reducers
    this.gifsLoaded$.pipe(takeUntilDestroyed()).subscribe((response) => 
      this.state.update((state) => ({
        ...state,
        gifs: [...state.gifs, ...response.gifs],
        loading: false,
        lastKnownGif: response.lastKnownGif,
      }))
    );

    this.subredditChanged$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.state.update((state) => ({
        ...state,
        loading: true,
        gifs: [],
        lastKnownGif: null,
      }));
    });
    //#endregion
  }

  private fetchFromReddit(subreddit: string, after: string | null, gifsRequired: number) {
    return this.http
      .get<RedditResponse>(`https://www.reddit.com/r/${subreddit}/hot/.json?limit=100` + (after ? `&after=${after}` : ''))
      .pipe(
        catchError((err) => EMPTY),
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
}