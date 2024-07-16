import { Component, inject } from '@angular/core';
import { GifListComponent } from "./ui/gif-list/gif-list.component";
import { RedditService } from '../shared/data-access/reddit.service';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { SearchBarComponent } from "./ui/search-bar/search-bar.component";
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [GifListComponent, InfiniteScrollDirective, SearchBarComponent, MatProgressSpinner],
  templateUrl: './home.component.html',
  styleUrl: './home.component.less'
})
export default class HomeComponent {
  redditService = inject(RedditService);
}
