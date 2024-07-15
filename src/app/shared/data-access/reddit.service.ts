import { computed, inject, Injectable, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Gif, RedditPost, RedditResponse } from "../interfaces";
import { catchError, EMPTY, map, Observable, of } from "rxjs";
import { HttpClient } from "@angular/common/http";

export interface GifsState {
  gifs: Gif[]
}

@Injectable({
  providedIn: 'root'
})
export class RedditService {
  private http = inject(HttpClient);

  //#region state
  private state = signal<GifsState>({
    gifs: []
  });
  //#endregion

  //#region selectors
  gifs = computed(() => this.state().gifs);
  //#endregion

  //#region sources
  gifsLoaded$ = this.fetchFromReddit('gifs');
  //#endregion

  constructor() {
    //#region reducers
    this.gifsLoaded$.pipe(takeUntilDestroyed()).subscribe((gifs) => 
      this.state.update((state) => ({
        ...state,
        gifs: [...state.gifs, ...gifs],
      }))
    );
    //#endregion
  }

  private fetchFromReddit(subreddit: string): Observable<Gif[]> {
    return this.http
      .get<RedditResponse>(`https://www.reddit.com/r/${subreddit}/hot/.json?limit=100`)
      .pipe(
        catchError((err) => EMPTY),
        map((response) => this.convertRedditPostsToGifs(response.data.children))
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