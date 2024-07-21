import { Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFabButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatToolbarModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatFabButton
  ],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.less'
})
export class SearchBarComponent {
  subredditFormControl = input.required<FormControl>();
  randomSubreddit = output<void>();
}
